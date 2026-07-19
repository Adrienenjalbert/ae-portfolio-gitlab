# AGENTS.md

## Learned User Preferences

- Avoid em-dashes and other "AI-sounding" phrasing; follow Wikipedia's "Signs of AI writing" guidance so copy reads naturally and human.
- Use the blue color scheme consistently across all pages, and keep section layout and initiative grouping consistent site-wide.
- Trigger chart and scroll animations only when the element enters the viewport, not on initial page load.
- Write headlines as short, punchy, ATS-friendly lines (example style: "Applied AI for Revenue Growth | MSc AI & Data Science").
- Position Adrien around 10+ years of growth/performance analytics plus applied AI and an MSc in AI & Data Science for revenue growth.
- Prefer tailored, interactive deep-dive pages for each project, initiative, and interview take-home; for company-specific interview cases, match that company's brand colors and build both a company-branded version and a portfolio-branded version linked internally so recruiters can navigate between them. Keep sections simple and highly visual with light, purposeful animation, favor concise bullet points over dense text blocks, take design inspiration from reference apps the user shares, and where it fits build functional interactive AI demo or lead-magnet end products (with a PRD) rather than static descriptions.
- Keep quality high for recruiters and hiring managers: clear, easy to read, with strong storytelling that stays data-driven; for interview cases explicitly answer every question in the brief and ground the solution in the target company's real organizational constraints (cross-team collaboration, buy-in, change management with small wins, data ETL and clean-up, integration with existing systems like Braze CRM, UX adoption) rather than just the AI model; verify, test, improve, then push to GitHub. Iterate on UI and design in a critical self-review loop (using UI/UX design skills) until it is world-class before finishing, and when asked, explain the reasoning behind each step and how Adrien can present or demo it, tailored to his background in performance marketing, attribution, and no-code/low-code AI building.
- Build charts that are authentic and credible, rebuilt from the source portfolio PDFs rather than fabricated numbers.
- Use real company names in portfolio content (e.g. Indeed) rather than anonymized placeholders.
- Do not make assumptions about Adrien's experience; read existing app content to get facts right before editing.
- Ensure every page and section is fully responsive and renders cleanly on mobile.
- Ground UI, UX, and content improvements in established frameworks (Core Web Vitals, E-E-A-T, HEART, NN/g heuristics, WCAG 2.2 AA) and market research; structure AI and data-science reasoning around CRISP-DM, leading with the business problem and the data.

## Learned Workspace Facts

- This is a static HTML/CSS/JS personal portfolio site for Adrien Enjalbert with no build framework.
- Pages include index.html, multiple cv*.html variants, for-*.html audience pages, and work/*.html project pages.
- Shared assets live in assets/ (e.g. theme.css, work.css, work.js, portfolio-charts.css, portfolio-charts.js).
- Deployed via GitHub Pages at https://adrienenjalbert.github.io/ae-portfolio-gitlab/ (repo https://github.com/Adrienenjalbert/ae-portfolio-gitlab).
- Adrien has ~10 years in performance marketing/analytics and ~2 years in AI, with an MSc in AI & Data Science started around 2024.
- Per-company interview take-home pages live in their own top-level folders (e.g. demand-gen-Stravito/, demand-gen-Vortexa/, ai-growth-Tripadvisor/), each with its own index.html and assets, deployed as separate pages with their own menu on the GitHub Pages site.
- Some interview submissions also require standalone PPTX and PDF deliverables that are highly visual, on-brand with the target company, and easy to present.
- Planning and audit docs live in docs/ (e.g. optimization-framework-plan.md, portfolio-audit.md, ux-design-audit.md).
- The Career Hub is the Indeed Flex career hub (indeedflex.com/career-hub), a Next.js programmatic-SEO site (~6,000 pages) built on an open-source CMS, documented as a portfolio case study (work/career-hub-organic.html) with Google Search Console performance data.
- Demand-gen deep-dive pages present a full-funnel model where each stage aligns its own goal, KPI, audience, messaging, and landing page, shows remarketing between stages, and can include an ABM angle.
- The ai-growth-Tripadvisor interview case study includes an interactive AI customer persona simulator lead magnet (persona-simulator.html) and sections covering knowledge management, AI debugging, stakeholder management, and AI investment prioritization, structured around CRISP-DM.
