/**
 * @fileoverview End-to-End Cypress Tests for Carbon Footprint App.
 */

describe('Carbon Footprint App E2E Flows', () => {
  beforeEach(() => {
    // Clear local storage and mock authentication
    cy.clearLocalStorage();
    cy.visit('http://localhost:3000');
  });

  it('should display the dashboard with stats and Gemini audit insights', () => {
    cy.get('header').should('contain', 'Namaste!');
    cy.get('section').should('contain', 'Average Daily Footprint');
    cy.get('section').should('contain', 'Total Points Earned');
    cy.get('section').should('contain', 'Gemini AI Carbon Audit');
  });

  it('should navigate to daily tracker and log carbon footprint activities', () => {
    // Navigate using Navbar links
    cy.get('nav').contains('Daily Tracker').click();
    cy.url().should('include', '/tracker');

    // Fill the tracker form
    cy.get('select#vehicle-type').select('ev');
    cy.get('input#distance-km').type('30');
    cy.get('input#electricity-kwh').type('8');
    cy.get('input#solar-adopted').check();
    cy.get('input#food-waste').type('1.5');
    cy.get('input#composted').check();
    cy.get('input#biogas-adopted').check();
    cy.get('input#plants-grown').type('3');
    cy.get('input#disaster-awareness').check();

    // Submit log
    cy.get('form').submit();

    // Verify success banner and history entry addition
    cy.get('[role="alert"]').should('contain', 'Log saved successfully!');
    cy.get('table').should('contain', 'EV (30km)');
    cy.get('table').should('contain', '+'); // Points award indicator
  });

  it('should simulate geolocation and trigger geofence points reward', () => {
    cy.get('nav').contains('Green Locator').click();
    cy.url().should('include', '/locator');

    // Check mapping coordinates or mock container
    cy.get('section').should('contain', 'Map');

    // Simulate geolocation jump via locator panel
    cy.get('select#simulate-zone').select('delhi-lodhi-garden');

    // Verify that geofence banner is triggered
    cy.get('[role="alert"]').should('contain', 'Geofence Matched!');
    cy.get('[role="alert"]').should('contain', 'Lodhi Garden Green Zone');
  });

  it('should interact with Gemini Coach chatbot', () => {
    cy.get('nav').contains('AI Coach').click();
    cy.url().should('include', '/coach');

    // Initial greeting check
    cy.get('[role="log"]').should('contain', 'AI Carbon Coach');

    // Send a message
    cy.get('input[type="text"]').type('Why is biogas beneficial in India?');
    cy.get('form').submit();

    // Chat should show loader, then append coach response
    cy.get('[role="log"]').should('contain', 'Why is biogas beneficial in India?');
    cy.get('[role="log"]').should('contain', 'Coach'); // Avatar indicator
  });
});
