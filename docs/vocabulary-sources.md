# Vocabulary data sources

WordQuest keeps collection membership separate from the vocabulary entry so one word can belong to several learning tracks without duplication.

## US K–12 core English

This is a WordQuest-constructed study collection, not an official curriculum published by a US state or school district. It selects common content words from ECDICT's contemporary-corpus frequency data and school-vocabulary tags, removes inflected forms and function words, and divides the result into K–2, 3–5, 6–8, and 9–12 bands by frequency.

- Source: [ECDICT](https://github.com/skywind3000/ECDICT)
- License: MIT
- Imported fields: headword, phonetic spelling, English definition, Chinese meaning, corpus rank

## IELTS and TOEFL academic English

IELTS and ETS do not publish a complete official “required vocabulary list.” These are preparation collections and must not be described as official exam-provider lists.

- Source: [TOEFL Essential Vocabulary Dataset](https://github.com/gungorkaya-eng/toefl-essential-vocabulary-dataset)
- License: MIT
- Scope: 1,000 academic words with part of speech, theme, definition, example, synonyms, and difficulty
- Collection memberships: IELTS Academic Preparation and TOEFL Academic Preparation
- Chinese meanings and phonetics are matched from ECDICT where available.
