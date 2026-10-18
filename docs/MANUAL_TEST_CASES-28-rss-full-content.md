# Manual Test Cases — #28 Full post content in the RSS feed

Ticket: https://github.com/mmcguff/mmcguff.github.io/issues/28 · Plan: [PLAN-28-rss-full-content.md](plans/PLAN-28-rss-full-content.md)

| # | AC | Steps | Expected Result | Environment |
|---|----|-------|------------------|-------------|
| 1 | AC9 | After deploy, open https://validator.w3.org/feed/check.cgi?url=https%3A%2F%2Fdevguff.com%2Frss.xml | "This is a valid RSS feed." Warnings are acceptable; note any. | Production |
| 2 | AC1 | `curl -s https://devguff.com/rss.xml \| grep -c '<content:encoded>'` | Equals the number of published posts (currently 1). | Production |
| 3 | AC2 | Open the feed in a reader (e.g. https://feedly.com or https://www.inoreader.com, "add by URL"), then open the starter post. | Full article text with headings, lists and code blocks. Not just the one-sentence description. | Production |
| 4 | AC3 | In the reader, look at the code samples. | Monospace, readable, no stray colour codes. | Production |
| 5 | AC4 | In the reader, click the "`/rss.xml`" link in the post. | Opens https://devguff.com/rss.xml (not a broken relative link). | Production |
| 6 | — | Optional, when syndication is set up: DEV.to → Settings → Extensions → "Publishing to DEV from RSS", point it at the feed and fetch. | The draft import shows the full article, with the canonical URL set to devguff.com. | DEV.to |
