---
name: name-it
description: Name a product, startup, app or side project and find out whether the name is actually free. Interviews the user about what they are building, suggests names, then checks the chosen name's domains, social handles, Canadian trademarks and search results, and gives a clear verdict. Use this whenever the user wants name ideas, asks "is this name taken", wants to check a domain or handle for a brand, is choosing between candidate names, or mentions naming, renaming or branding something they are building, even if they don't ask for a full check.
---

# Name it

Naming something is hard, and finding out later that the name is taken is worse. This skill gets the user from "I need a name" to "this one is mine to use" in one conversation.

There are three stages: understand the product, suggest names, check the one they pick. Enter at whichever stage the user is already at. If they arrive with a name ("is Lumora taken?"), go straight to the check.

## 1. Understand the product

Good names come from specifics, so learn enough to be specific. Ask only for what the conversation hasn't already told you, in one batch rather than one question at a time:

- What it does and who it is for, in a sentence
- The industry or space it competes in (this also decides what counts as a conflict later)
- The feel they want: playful, serious, technical, warm
- Anything fixed: a length limit, a word to include or avoid, must have the .com

If you are working inside the product's repo, read the README first and skip whatever it answers. Two to four questions is plenty; the user came for names, not a questionnaire.

## 2. Suggest names

Offer six to eight names, each with one line on where it comes from. Spread them across these styles unless the user has asked for one:

- **Latin root**: built from a Latin or Greek root that fits the product (Lumora, from *lumen*, light)
- **Everyday word**: a real, common word used in a new context (Heron, a patient wading bird)
- **Borrowed word**: a word from another language with a fitting meaning
- **Invented**: a coined word that is easy to say and spell

Names should be easy to say aloud, easy to spell after hearing them once, and short enough to type as a domain.

Before showing the list, screen it so the user doesn't fall for a name that is obviously gone. The script lives in this skill's own directory:

```sh
python3 scripts/check.py Lumora Heron Tundra --quick
```

`--quick` looks up only the .com and the GitHub handle. Show available names first and mark the rest as taken rather than hiding them, since a taken .com is not always a dealbreaker. If most of the list is taken, generate a fresh batch instead of presenting a list of dead ends.

Then let the user pick one, ask for more in a style, or bring their own.

## 3. Check the name

Four checks. Run the script and the two research checks at the same time where your tools allow.

### Domains and handles

```sh
python3 scripts/check.py Lumora
```

This prints JSON covering .com, .ca, .io, .ai, .co and .app, plus GitHub, YouTube, X, Instagram, TikTok and LinkedIn. Pass `--tlds .com,.dev` when the user cares about other extensions.

Each result is `available`, `taken` or `unknown`. `unknown` means the lookup could not give a straight answer. X, Instagram, TikTok and LinkedIn are always `unknown`, because those sites give anonymous visitors the same response whether or not a handle exists. Report unknowns as "check by hand" with the link. Never round an unknown up to available: a false "it's free" is the one mistake this skill exists to prevent.

If the script cannot reach the network (a sandbox that blocks outside requests), say so and give the user the links to check themselves instead of guessing.

### Trademarks

Search the Canadian Trademarks Database (https://ised-isde.canada.ca/cipo/trademark-search/srch) for the name, using your web tools. Look for marks that are identical or sound alike, and note each one's status (registered, pending, abandoned), owner, and the goods and services it covers. A live mark in the user's own space is a serious conflict. A live mark in an unrelated space usually is not, and an abandoned mark is not.

If you can't run the search, give the user the link and tell them what to look for. Either way, say plainly that this is a first screen and not legal advice, and that a trademark agent should confirm before they spend money on the brand.

Canada is the default. If the user sells mainly somewhere else, search that country's trademark register as well.

### Search results

Search the web for the name alone, and for the name plus the industry. You are looking for how crowded the name is:

- **Wide open**: no company or product is using it
- **Some overlap**: it is in use, but in unrelated spaces
- **Crowded**: a company in the same space uses it, several brands share it, or someone is running ads on it

Name the specific companies you find, with links. Those are what the user will act on.

## Report

Lead with the verdict, then the evidence. Use this shape:

```
## Lumora: taken

lumora.com is taken and there is 1 active Canadian trademark in software.

| Check          | Result                   |
|----------------|--------------------------|
| Trademarks     | 1 active in Canada       |
| Domains        | lumora.com is taken      |
| Social handles | 1 of 2 free, 4 to check  |
| Search         | Crowded                  |

### Domains
| Domain     | Status    | Register                     |
|------------|-----------|------------------------------|
| lumora.com | Taken     |                              |
| lumora.io  | Available | Cloudflare, Namecheap, ...   |
```

Follow with a short section for each of the other checks: the handles with their links, the trademarks found, the search hits.

The verdict is one of:

- **Yours**: no live trademark in their space, the .com (or the extension they said they want) is free, and search is not crowded
- **Usable with compromises**: no trademark conflict, but the .com is gone or search has some overlap. Say exactly what they would be giving up.
- **Taken**: a live trademark in their space, or an established company in their space already using the name

A trademark conflict outweighs everything else, because a domain can be worked around and a legal claim can't.

When the name is taken or compromised, don't stop at the bad news. Offer close alternatives (a different extension, a small spelling change, a prefix like "get" or "try") and offer to check them, or go back to stage 2 for a fresh batch.
