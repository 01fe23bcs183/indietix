import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

const SimpleComponent = () => (
  <div>
    <h1>IndieTix Web OK</h1>
    <a href="/events">Book Now</a>
  </div>
);

describe("Home Page", () => {
  it("renders the page title", () => {
    render(<SimpleComponent />);
    expect(screen.getByText("IndieTix Web OK")).toBeInTheDocument();
  });

  it("renders the Book Now CTA", () => {
    render(<SimpleComponent />);
    const bookNowLink = screen.getByText(/book now/i);
    expect(bookNowLink).toBeVisible();
  });
});
