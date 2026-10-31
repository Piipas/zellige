# Contributing

Thanks for wanting to help! Bug reports, fixes and new themes are all welcome.

## Getting set up

```bash
git clone https://github.com/Piipas/zellige.git
cd zellige
cp .env.example .env.local   # add a classic GitHub token with no scopes
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck && npm run lint && npm run build
```

CI runs the same checks on every pull request.

## Adding a theme (a great first contribution)

Themes live in one place: the `THEMES` object at the top of [`lib/render.ts`](lib/render.ts). Each theme is a plain object:

```ts
chefchaouen: {
  grout: "#eef3f8",   // background and the lines between tiles
  empty: "#dbe5ef",   // stars on days with no contributions
  levels: ["#9cc3e6", "#4f8fc9", "#24609e", "#c8922a"], // quietest → busiest day
  cross: "#1d3557",   // small cross pieces at the corners (drawn at 55% opacity)
  heart: "#f8fbff",   // octagon inside the two busiest levels
  text: "#3d4f63",    // the title line
},
```

Adding the object is all you need: the endpoint (`?theme=chefchaouen`), the website's theme switcher and the preview script pick it up automatically.

Tips for a palette that works:

- **Name it after a place** with a tile tradition (Fes, Marrakech, Tetouan, Chefchaouen, Isfahan, Granada…). It fits the project, and the name doubles as the URL value, so keep it lowercase with no spaces.
- **`levels` should read as a ramp.** A viewer should be able to tell level 1 from level 4 at a glance. A contrasting accent for the last level, like the ochre in `fes`, works well.
- **`empty` sits close to `grout`** so the busy days stand out, but stays different enough that the grout lines show.
- **`heart` needs contrast** against `levels[2]` and `levels[3]`.
- **Check it on GitHub's background.** Light themes sit on white and dark themes on `#0d1117`.

Then preview it:

```bash
npm run preview   # writes preview-<theme>.svg for every theme
```

Open the SVG in a browser and attach a screenshot to your pull request. To also add it to the README gallery, run `npm run preview -- docs` and add a section to `README.md`.

## Reporting bugs

Please use the bug report template and include the username (if it's public) and the exact URL you used.
