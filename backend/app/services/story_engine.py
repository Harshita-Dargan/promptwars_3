import json
import logging
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.config import settings

logger = logging.getLogger(__name__)

class StoryResponse(BaseModel):
    story_text: str = Field(description="The narrative description of the user's environment.")
    environmental_state: str = Field(description="One of: 'foggy_abyss', 'cracked_earth', 'misty_hill', 'clear_sky'")

SYSTEM_INSTRUCTION = """
You are the voice of the Earth's atmosphere—a physical entity that shifts under the weight of human carbon debt. 
Your task is to generate a visceral, narrative story that describes the user's environment based on their current carbon debt.

Core Narrative Guidelines:
1. Carbon is NOT an abstract number or statistic. It is a physical, heavy weight (boulders, thick gray iron domes, dense gravity, crushing pressure, heavy fog) that is pinned to the user.
2. Healthy/sustainable habits do NOT just give points; they literally chip away at this rock-hard mass, allowing the user to float higher into the air.
3. Use deep, atmospheric, sensory-rich language. Avoid happy corporate clichés or preachy guilt.
4. Adapt the description dynamically based on the current mass relative to the baseline mass:
   - High Carbon Debt (>80% of baseline left): Describe a suffocating, heavy fog, cracked soil, thick heat domes, low-hanging clouds of gray ash, and a feeling of heavy gravity.
   - Medium Carbon Debt (40% - 80% left): Describe thinning mist, cool air currents, the first green sprouts emerging from dark earth, and rising above the valley floor.
   - Low Carbon Debt (<40% left): Describe light, crystalline air, clean horizons, floating high above the clouds, weightlessness, and an environment in perfect balance.
"""

def get_fallback_story(current_mass: float, baseline_mass: float) -> dict:
    ratio = current_mass / baseline_mass if baseline_mass > 0 else 1.0
    
    if ratio > 0.8:
        return {
            "story_text": f"You stand in a dry, cracked valley. Above you, a gray, suffocating mist of {current_mass:.0f} kilograms of carbon gas hovers like an iron dome, pressing down on the soil. The air is stagnant, and a heavy, crushing gravity keeps your feet pinned to the dusty ground.",
            "environmental_state": "cracked_earth"
        }
    elif ratio > 0.4:
        return {
            "story_text": f"The weight of the sky has lessened. The carbon dome has dropped to {current_mass:.0f} kilograms. The heavy fog starts to curl back at the edges, revealing a pale sunset and misty hills. You feel the soil breathe, and a green seedling pushes through the dust as the gravitational pull softens.",
            "environmental_state": "misty_hill"
        }
    else:
        return {
            "story_text": f"You float in pure, crystalline ether. Only {current_mass:.0f} kilograms of carbon remain, drifting below you like harmless cotton wisps. The air is sweet, clear, and cold. Under a boundless azure sky, your environment is balanced, weightless, and alive.",
            "environmental_state": "clear_sky"
        }

async def generate_ecosystem_story(
    baseline_mass: float,
    current_mass: float,
    completed_actions: list,
    active_actions: list
) -> dict:
    """
    Invokes the Gemini API using structured JSON schema output to generate 
    a visceral story about the user's ecosystem progress.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set. Using local template engine for narrative story.")
        return get_fallback_story(current_mass, baseline_mass)

    # Calculate metrics
    mass_chipped_away = baseline_mass - current_mass
    percent_reduced = (mass_chipped_away / baseline_mass * 100) if baseline_mass > 0 else 0

    user_context = {
        "baseline_mass_kg": baseline_mass,
        "current_mass_kg": current_mass,
        "mass_chipped_away_kg": mass_chipped_away,
        "percentage_chipped_away": f"{percent_reduced:.1f}%",
        "habits_integrated": completed_actions,
        "active_struggles": active_actions
    }

    prompt = f"""
    Analyze the user's environmental metrics and write their narrative profile:
    User Context:
    {json.dumps(user_context, indent=2)}
    
    Generate their custom story text and pick their exact environmental state.
    """

    try:
        # Initialize Gemini Client with api_key
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=StoryResponse,
                temperature=0.7,
            ),
        )
        
        story_data = json.loads(response.text)
        # Validate that environmental_state matches expected strings
        valid_states = ["foggy_abyss", "cracked_earth", "misty_hill", "clear_sky"]
        if story_data.get("environmental_state") not in valid_states:
            # Force valid mapping
            ratio = current_mass / baseline_mass if baseline_mass > 0 else 1.0
            if ratio > 0.8:
                story_data["environmental_state"] = "cracked_earth"
            elif ratio > 0.4:
                story_data["environmental_state"] = "misty_hill"
            else:
                story_data["environmental_state"] = "clear_sky"
                
        return story_data
        
    except Exception as e:
        logger.error(f"Error invoking Gemini API: {e}. Falling back to default narrative template.")
        return get_fallback_story(current_mass, baseline_mass)
