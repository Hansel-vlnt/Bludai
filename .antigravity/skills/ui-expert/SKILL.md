---
name: ui-expert
description: Sourced from toss-style-design-system.mdc and visual testing standards. Specialist in quiet, high-trust UI, disciplined spacing, typography, grayscale hierarchy, restrained color, cards, dark mode, WCAG accessibility, and dual-viewport inspection.
---

# Toss-Style Design System & UI Specialist Skill (`ui-expert`)

*Sourced directly from `toss-style-design-system.mdc` with Playwright dual-viewport visual inspection.*

---

## 1. Design Direction
- Build quiet, high-trust product UI with clear hierarchy, generous spacing, and minimal ornament.
- Use one primary accent color and rely on grayscale for most structure.
- Avoid decorative gradients, unnecessary shadows, and competing accent colors.
- Prioritize readability, confidence, and fast scanning over visual novelty.

---

## 2. Typography
- Use a strict type scale with clear roles for page title, section title, body, supporting text, and metadata.
- Use font weight and color before using large size changes.
- Never use pure black text; use a dark grayscale foreground.
- Keep line height comfortable for body copy and tighter for short labels or metrics.
- For metrics, make the number visually dominant and the unit smaller but still legible.

---

## 3. Layout and Rhythm
- Use consistent spacing tokens (`gap-*`, standard paddings).
- Keep related content close and unrelated content separated by whitespace.
- Use section rhythm: summary, details, action, and supporting context.
- Align form fields, values, and controls predictably.
- Avoid nested cards and excessive borders.
- Always specify `min-w-0` on flex children with truncated text to prevent container blowout.

---

## 4. Cards and Surfaces
- Use cards only for grouped content that needs a surface.
- Keep card radius restrained and consistent (`rounded-2xl` or `rounded-xl`).
- Use subtle shadows or borders, not both heavily.
- Keep shadow opacity low and avoid dramatic elevation.
- Do not place important controls in low-contrast decorative surfaces.

---

## 5. Color
- Use the accent color for primary actions, selected state, links, or critical brand moments.
- Use semantic colors for status only: success, warning, error, and information.
- Keep disabled and secondary states in grayscale.
- Ensure status is never communicated by color alone (pair with icons, badges, or text).

---

## 6. Dark Mode
- Rebuild the grayscale scale for dark mode rather than inverting colors.
- Reduce bright accent intensity on dark backgrounds.
- Preserve contrast between surface (`#222336`), border (`#383a54`), and foreground layers.
- Test charts, cards, and form controls in both modes.

---

## 7. Accessibility (WCAG AA)
- Meet WCAG AA contrast for text (4.5:1 minimum) and controls (3.0:1 minimum).
- Provide visible focus states (`focus-visible:ring-2`).
- Keep tap targets large enough for touch (minimum 44×44px on mobile).
- Use semantic HTML and labels before adding ARIA.
- Respect reduced motion preferences.

---

## 8. Common Mistakes to Avoid
- Do not create one-off spacing values.
- Do not mix multiple unrelated accent colors.
- Do not overuse cards to separate every piece of content.
- Do not rely on large hero typography inside dense product screens.

---

## 9. Automated Dual-Viewport Inspection Loop
Before declaring any UI task resolved, run visual verification across both standard viewports:
- **Desktop Viewport:** `1440 × 900`
- **Mobile Viewport:** `375 × 812`

```javascript
import { chromium } from 'playwright';

async function runVisualInspection(url, outputDir = 'docs/screenshots') {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop Capture (1440x900)
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(url, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: `${outputDir}/inspection_desktop_1440x900.png` });

  // Mobile Capture (375x812)
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await mobile.goto(url, { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: `${outputDir}/inspection_mobile_375x812.png` });

  await browser.close();
}
```

### Visual Verification Gate Criteria
- [ ] No horizontal overflow / horizontal scrollbar on body.
- [ ] No button, badge, or text touching outer container edges (minimum 12px padding).
- [ ] Long labels truncate with ellipsis (`...`) without clipping adjacent controls.
- [ ] Responsive adaptation: 3-panel layouts collapse cleanly into single-column or drawers on mobile.

---

## 10. Bludai Project Application Notes & Conflict Resolutions

### Conflict 1: Toss "Avoid Dramatic Elevation" vs. 3-Tier Elevation System
- **Resolution:** "Restrained" means subtle-but-still-distinguishable surfaces, **not** a return to flat or matching backgrounds where cards blend invisibly into the canvas.
- **Specification:** The 3-tier elevation system is mandatory for container hierarchy:
  - **Canvas Base:** `#161622`
  - **Header & Section Bars:** `#141420`
  - **Cards & Floating Panels:** `#222336` bounded by crisp `border border-[#383a54]` and restrained `shadow-lg shadow-black/40`.
- **Ceiling:** Restraint is achieved by avoiding exaggerated blur radii, neon glows, or skeuomorphic bevels—not by flattening surfaces.

### Conflict 2: Toss "Single Accent + Grayscale" vs. 4-Color Specialist Coding
- **Resolution:** The 4-color specialist category coding (`cyan`, `green`, `gold`, `purple`) is an **intentional functional exception** for domain-specific visual identification (scannable telemetry & fleet roster), not decorative ornament.
- **Boundaries:**
  1. **Strictly Functional:** Specialist colors are restricted to compact indicators: avatar rings, category badges, and telemetry pills. They must **never** be used for large card backgrounds, decorative gradients, or full container borders.
  2. **Never Color-Alone:** In accordance with WCAG AA and Toss Rule 5, specialist colors must always be accompanied by legible text labels (e.g. role name, ID) and status icons.
  3. **Single Interactive Accent:** All global interactive controls (primary action buttons, focus rings `focus-visible:ring-[#cba6f7]`, active navigation items) remain strictly governed by one primary accent (`#cba6f7`).

