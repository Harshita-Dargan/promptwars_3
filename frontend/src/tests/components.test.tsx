import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OnboardingQuiz from "../components/OnboardingQuiz";
import BoulderVisualizer from "../components/BoulderVisualizer";
import StoryDashboard from "../components/StoryDashboard";
import AscensionLeaderboard from "../components/AscensionLeaderboard";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      path: (props: any) => <path {...props} />,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe("OnboardingQuiz Component", () => {
  const mockQuestions = [
    {
      id: "q1",
      question: "Transit Mode?",
      category: "transit",
      options: [
        { value: "car", label: "Car", mass_factor_kg: 2000 },
        { value: "bike", label: "Bike", mass_factor_kg: 0 }
      ]
    },
    {
      id: "q2",
      question: "Diet Mode?",
      category: "diet",
      options: [
        { value: "meat", label: "Meat", mass_factor_kg: 1500 },
        { value: "veg", label: "Vegetarian", mass_factor_kg: 500 }
      ]
    }
  ];

  it("renders questions and handles answer selection flow", async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OnboardingQuiz questions={mockQuestions} onSubmit={mockSubmit} />);

    // Renders first question
    expect(screen.getByText("Transit Mode?")).toBeInTheDocument();

    // Choice select and click Next
    const carOption = screen.getByText("Car");
    fireEvent.click(carOption);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    // Renders second question
    expect(screen.getByText("Diet Mode?")).toBeInTheDocument();

    // Choice select and click submit
    const vegOption = screen.getByText("Vegetarian");
    fireEvent.click(vegOption);

    const submitBtn = screen.getByRole("button", { name: /calculate weight/i });
    fireEvent.click(submitBtn);

    expect(mockSubmit).toHaveBeenCalledWith({
      q1: "car",
      q2: "veg"
    });
  });
});

describe("BoulderVisualizer Component", () => {
  it("renders correctly and displays mass", () => {
    render(<BoulderVisualizer currentMass={4500} baselineMass={6000} />);
    expect(screen.getByText("4,500")).toBeInTheDocument();
    expect(screen.getByText(/kg CO₂e/i)).toBeInTheDocument();
  });
});

describe("StoryDashboard Component", () => {
  it("renders clear_sky ecosystem state", () => {
    const mockRegen = vi.fn().mockResolvedValue(undefined);
    render(
      <StoryDashboard
        storyText="Sky is clear."
        environmentalState="clear_sky"
        currentMass={1200}
        altitude={8500}
        onRegenerate={mockRegen}
      />
    );

    expect(screen.getByText("The Ether Sky")).toBeInTheDocument();
    expect(screen.getByText(/"Sky is clear."/i)).toBeInTheDocument();
  });
});

describe("AscensionLeaderboard Component", () => {
  const mockUsers = [
    { rank: 1, username: "user_a", altitude: 8000, current_mass: 1000, baseline_mass: 5000 },
    { rank: 2, username: "user_b", altitude: 5000, current_mass: 2000, baseline_mass: 5000 }
  ];

  it("renders ranks and user statistics", () => {
    render(<AscensionLeaderboard users={mockUsers} currentUserId="user_b" />);
    expect(screen.getByText("user_a")).toBeInTheDocument();
    expect(screen.getByText("user_b")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument(); // matches user_b
    expect(screen.getByText("8000m")).toBeInTheDocument();
    expect(screen.getByText("5000m")).toBeInTheDocument();
  });
});
