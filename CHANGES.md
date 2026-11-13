# Chalkboard Studio – easier-to-use version

These changes make the app simpler for teachers who are less confident with technology.

## What teachers will notice

**Menu.** Three items only: *Make a lesson*, *School library*, *Help*. The pupil join address is always shown at the top right.

**Making a lesson.** Three numbered boxes (topic, year group and subject, what pupils should learn) and one big **Make my lesson** button.
- Year groups are single years (Reception, Year 1 … Year 13). The AI is told the exact year.
- "Make my lesson" builds a 3-game lesson (start, main, finish) with games that suit the age:
  Reception–Year 2: match, sort, bingo · Years 3–4: quiz, sort, bingo · Years 5–9: quiz, sort, team points quiz · Years 10–13: quiz, match, codebreaker.
- The objectives box is optional.
- The app remembers the last year group and subject.
- Uploading slides or worksheets, choosing a single game, extra support or challenge, and the number of questions are under **More options**.
- Game names are in plain English, e.g. "Sort into groups" or "Team points quiz".
- Error messages say what to do next.

**Checking questions.** The screen is titled "Check the questions before you play" and has a **Print worksheet** button. Leaving with unsaved edits saves them automatically.

**Playing.**
- The game is at the top of the screen. The side panel only has a simple timer and team points.
- **Show on board** fills the screen with just the game, timer and team points. Esc or *Exit board* returns.
- Music, sound effects, read-aloud, large text, cream background, easier/harder versions and teaching notes are all in one **Class tools** panel.
- The "How to run this game" steps show in full the first time a teacher uses each game type. After that they are folded into one line.

**Pupils on devices.**
- **Let pupils join on devices** opens a full-screen join page with a QR code, the join address, the big 4-letter code, and the names of pupils as they join.
- Pupils only type their first name. Teams and characters are given out automatically.
- Pupils use `/join` (or the QR code) and never see the teacher menu.

**Paper back-up.** **Print worksheet** works for all 10 game types. It makes a pupil page plus a separate teacher answer sheet.

**Read-aloud.** Language lessons are read in that language (French, Spanish, German, Hungarian, etc.). Everything else is read in British English, so a laptop set up in Hungarian no longer reads English questions in a Hungarian voice.

## Safety nets

- **Deleting** asks "Are you sure?" first. Teachers can only delete lessons they made. The library has an *Only my lessons* filter.
- **Editing someone else's lesson** (or a ready-made one) saves the teacher's own copy, marked "(my copy)". The original stays the same.
- **Live rooms**: only the teacher who started a room can freeze, reset or close it. The progress page only lists that teacher's own rooms.
- **Home page tagline** can only be edited by an admin (see `ADMIN_KEY` below).

How it works: each browser gets a random "device key" automatically (`src/utils/deviceKey.ts`). Nobody needs a password. The limitation is that a teacher who switches to a different computer, or clears their browser data, can no longer delete their older lessons. An admin can delete them instead. School Google sign-in would be the full fix later.

Lessons made before this update have no owner. Only an admin can delete them.

## For whoever runs the app

- `npm install` now works without errors (`esbuild` updated to `^0.27.0`).
- New dependency: `qrcode` (QR codes on the join page).
- `bun.lock` was removed because it was out of date. A fresh `package-lock.json` is included.
- Optional new setting **`ADMIN_KEY`** (see `.env.example`). Open the site once with `?admin=YOUR_KEY` and that browser can delete any lesson and edit the tagline.
- Generation errors are now written to the server log (`[generation error] …`), and teachers see a plain message.

## Still to do (not changed here)

Saved lessons are still kept in `data/activities.json`, and live rooms are held in server memory. On Google Cloud Run both can be lost when the app restarts or is updated, and rooms can break if more than one copy of the server runs. Moving lessons and rooms to a database (e.g. Firestore) fixes this.
