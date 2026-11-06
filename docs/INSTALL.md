# Installation / ইনস্টলেশন

## English

This ZIP is a **partial source handoff**, not an installer. Read STATUS.md and KNOWN_GAPS.md before use. Do not use for live accounting.

Developer: install Node 24, then `cd app`, `npm ci`, `npm run check`, `npm test`. The delivered renderer is a placeholder; Claude must supply the UI. For an experimental packaged build, set a private PETRA_LICENSE_SECRET of at least 32 characters and run `npm run dist` on Windows. This copies the contract into app/contract and embeds the release licensing secret. Petra can issue a code using `node tools/issue-license.js MMTR` from the repository root with the same secret. Do not distribute the issuing tool with the installed application.

NSIS targets per-user installation without elevation, plus portable executable. These targets have **not been built or verified on Windows**. Future end users should not need Node/Python/build tools. Application data path: `%APPDATA%\PetraDMS\data\data.db`. Reinstallation should preserve that external data directory. Local backup default: Documents\PetraDMS\Backups. Automatic backups and restore are unfinished; copy test data safely before experimentation. No live database in Drive/OneDrive/Dropbox.

## বাংলা

এটি **অসম্পূর্ণ সোর্স-কোড হ্যান্ডঅফ**, তৈরি করা ইনস্টলার নয়। বাস্তব দোকানের হিসাব চালানোর আগে STATUS.md ও KNOWN_GAPS.md পড়ুন।

ডেভেলপার Node 24 ইনস্টল করে app ফোল্ডারে `npm ci`, `npm run check`, `npm test` চালাবেন। এখানে শুধু খালি renderer আছে; Claude-এর UI যোগ করতে হবে। Windows-এ ইনস্টলার পরীক্ষামূলকভাবে বানাতে PETRA_LICENSE_SECRET সেট করে `npm run dist` চালাতে হবে। Windows ইনস্টলেশন এখানে পরীক্ষা করা হয়নি।

ডেটা থাকবে `%APPDATA%\PetraDMS\data\data.db`-এ। লাইভ ডেটাবেস Drive/OneDrive/Dropbox-এ রাখবেন না। স্বয়ংক্রিয় ব্যাকআপ, রিস্টোর ও Google Drive সংযোগ এখনো অসম্পূর্ণ। বাস্তব ব্যবসার ডেটা দিয়ে ব্যবহার করবেন না।
