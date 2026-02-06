const actions = document.querySelectorAll("[data-action]");
const planForm = document.querySelector(".plan-form");
const formNote = document.querySelector(".form-note");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");

actions.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "start-plan" || action === "generate-plan") {
      document.querySelector("#planning").scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (action === "sample-week") {
      document.querySelector("#insights").scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (action === "policy") {
      document.querySelector("#data").scrollIntoView({ behavior: "smooth" });
    }
  });
});

if (planForm) {
  planForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const race = planForm.elements.race.value || "your goal race";
    const date = planForm.elements.date.value || "the target date";
    const availability = planForm.elements.availability.value;
    const mileage = planForm.elements.mileage.value || "current mileage";

    formNote.textContent = `Drafting a ${availability}-day plan for ${race} on ${date} with ~${mileage} mi/week. We'll layer in constraints next.`;
  });
}

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileNav.hidden = isOpen;
  });
}
