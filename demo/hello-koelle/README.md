# hello-koelle

An Applet app. `app.js` exports `class App extends DurableObject`: one object holds the app's state (SQLite via `this.ctx.storage.sql`) and serves every request. Applet supplies the Worker configuration and runs the app at its own URL; the same files can be edited by an agent in chat.

## Run locally

```sh
pnpm install
pnpm dev
```

## Put it live

```sh
applet push      # saves a hosted draft so an agent can continue in chat; does not publish
applet deploy    # builds and publishes from here; no editable source upload
applet deploy --sync-source # explicitly syncs source, checks and publishes
applet pull      # fetches the files an agent changed in chat
```

## Access

The app starts private: only your signed-in Applet account can open it. Run `applet access public --yes` to let anyone with the link use it. Hosting settings live in `applet.jsonc`.

## Back up application state

Backups are enabled: run `applet backup` after deploying to download a JSON backup of the app's state.

## Delete

```sh
applet delete
```

This permanently deletes the app on Applet; it does not delete your local project.
