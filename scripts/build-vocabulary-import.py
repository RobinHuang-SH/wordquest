"""Build the licensed WordQuest vocabulary import artifact.

Usage:
    python scripts/build-vocabulary-import.py work/ecdict.csv server/data/vocabulary-import-v1.json
"""

from __future__ import annotations

import csv
import json
import re
import sys
import urllib.request
from pathlib import Path


TOEFL_URL = "https://raw.githubusercontent.com/gungorkaya-eng/toefl-essential-vocabulary-dataset/main/toefl_essential_vocabulary.json"
ECDICT_URL = "https://github.com/skywind3000/ECDICT"
WORDLEVEL_URL = "https://github.com/gungorkaya-eng/toefl-essential-vocabulary-dataset"
BAD_ACADEMIC_ENTRIES = {"inasmuchas", "followthrough"}
MANUAL_TRANSLATIONS = {"desalination": "脱盐；海水淡化", "encrypt": "加密；把信息编码"}

STOPWORDS = set(
    """a an the and or but if while as because although of at by for with about against between
    into through during before after above below to from up down in out on off over under again
    further then once here there when where why how all any both each few more most other some such
    no nor not only own same so than too very can will just should now i me my myself we our ours
    ourselves you your yours yourself yourselves he him his himself she her hers herself it its
    itself they them their theirs themselves what which who whom this that these those am is are was
    were be been being have has had having do does did doing would could ought im youre hes shes its
    were theyre ive youve weve theyve id youd hed shed wed theyd ill youll hell shell well theyll
    isnt arent wasnt werent hasnt havent hadnt doesnt dont didnt wont wouldnt shant shouldnt cant
    cannot couldnt mustnt lets thats whos whats heres theres whens wheres whys hows""".split()
)


def part_of_speech(translation: str) -> str:
    value = translation.strip().lower()
    if re.match(r"^n\.", value):
        return "noun"
    if re.match(r"^(vt\.|vi\.|v\.)", value):
        return "verb"
    if re.match(r"^(adj\.|a\.)", value):
        return "adjective"
    if re.match(r"^adv\.", value):
        return "adverb"
    return ""


def chinese_meaning(value: str) -> str:
    line = next((item.strip() for item in value.splitlines() if item.strip() and not item.startswith("[")), "")
    line = re.sub(r"^(?:n|v|vt|vi|a|adj|adv)\.\s*", "", line, flags=re.I)
    return line[:200].strip(" ,;")


def english_definition(value: str) -> str:
    line = next((item.strip() for item in value.splitlines() if item.strip()), "")
    line = re.sub(r"^(?:n|v|s|r|a|prep|conj)\.\s*", "", line, flags=re.I)
    return line[:500].strip()


def grade_data(index: int) -> tuple[str, str]:
    if index < 750:
        return "A1", "K-2"
    if index < 1500:
        return "A2", "3-5"
    if index < 2250:
        return "B1", "6-8"
    return "B2", "9-12"


def exam_level(difficulty: int) -> str:
    return {3: "B2", 4: "C1", 5: "C2"}.get(difficulty, "C1")


def main() -> None:
    ecdict_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    rows_by_word: dict[str, dict[str, str]] = {}
    k12_candidates: list[tuple[int, str, dict[str, str], str]] = []

    with ecdict_path.open("r", encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            word = row["word"].strip().lower()
            if not re.fullmatch(r"[a-z]{2,30}", word):
                continue
            rows_by_word[word] = row
            tags = set((row.get("tag") or "").split())
            rank = int(row.get("frq") or 0)
            pos = part_of_speech(row.get("translation") or "")
            if (
                word in STOPWORDS
                or "0:" in (row.get("exchange") or "")
                or not ({"zk", "gk"} & tags)
                or rank <= 0
                or not pos
                or not chinese_meaning(row.get("translation") or "")
                or not english_definition(row.get("definition") or "")
            ):
                continue
            k12_candidates.append((rank, word, row, pos))

    k12_candidates.sort(key=lambda item: (item[0], item[1]))
    k12_candidates = k12_candidates[:3000]
    words: dict[str, dict[str, object]] = {}
    for index, (rank, word, row, pos) in enumerate(k12_candidates):
        level, grade_band = grade_data(index)
        words[word] = {
            "word": word,
            "lemma": word,
            "partOfSpeech": pos,
            "level": level,
            "meaningZh": chinese_meaning(row["translation"]),
            "definitionEn": english_definition(row["definition"]),
            "phoneticUs": (row.get("phonetic") or "")[:100] or None,
            "frequencyRank": rank,
            "exampleSentence": f'The teacher gave a clear example of the word "{word}".',
            "sourceName": "ECDICT",
            "sourceLicense": "MIT",
            "collection": "us-k12-core",
            "memberships": [
                {
                    "collectionKey": "us-k12-core",
                    "rank": index + 1,
                    "gradeBand": grade_band,
                    "metadata": {"corpusRank": rank, "constructed": True},
                }
            ],
        }

    request = urllib.request.Request(TOEFL_URL, headers={"User-Agent": "WordQuest-Importer"})
    with urllib.request.urlopen(request) as response:
        academic = json.load(response)
    for index, item in enumerate(academic):
        word = str(item["word"]).strip().lower()
        if not re.fullmatch(r"[a-z]{2,40}", word) or word in BAD_ACADEMIC_ENTRIES:
            continue
        ecdict = rows_by_word.get(word, {})
        membership_data = {
            "rank": index + 1,
            "gradeBand": "academic",
            "metadata": {
                "theme": item.get("theme"),
                "difficulty": item.get("difficulty"),
                "synonyms": item.get("synonyms", []),
            },
        }
        memberships = [
            {"collectionKey": "ielts-academic", **membership_data},
            {"collectionKey": "toefl-academic", **membership_data},
        ]
        if word in words:
            words[word]["memberships"].extend(memberships)  # type: ignore[union-attr]
            continue
        meaning = (
            chinese_meaning(ecdict.get("translation", ""))
            or MANUAL_TRANSLATIONS.get(word)
            or f"学术词汇：{word}"
        )
        words[word] = {
            "word": word,
            "lemma": word,
            "partOfSpeech": str(item.get("pos") or "word")[:30],
            "level": exam_level(int(item.get("difficulty") or 4)),
            "meaningZh": meaning,
            "definitionEn": str(item.get("definition_en") or "")[:500],
            "phoneticUs": (ecdict.get("phonetic") or "")[:100] or None,
            "frequencyRank": 50000 + index,
            "exampleSentence": str(item.get("example_sentence") or "")[:500],
            "sourceName": "WordLevel TOEFL/IELTS 1K",
            "sourceLicense": "MIT",
            "collection": "toefl-ielts-academic",
            "memberships": memberships,
        }

    payload = {
        "collections": [
            {
                "key": "us-k12-core",
                "name": "美国 K–12 核心英语",
                "description": "按美式当代语料频率和学校词汇标签构建的 K–12 学习集合，非州教育部门官方课程表。",
                "sourceUrl": ECDICT_URL,
                "sourceLicense": "MIT",
            },
            {
                "key": "ielts-academic",
                "name": "IELTS 学术备考",
                "description": "用于 IELTS 学术英语准备的公开词表，非 IELTS 官方必背词表。",
                "sourceUrl": WORDLEVEL_URL,
                "sourceLicense": "MIT",
            },
            {
                "key": "toefl-academic",
                "name": "TOEFL 学术备考",
                "description": "用于 TOEFL iBT 学术英语准备的公开词表，非 ETS 官方必背词表。",
                "sourceUrl": WORDLEVEL_URL,
                "sourceLicense": "MIT",
            },
        ],
        "words": list(words.values()),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    membership_counts = {
        collection["key"]: sum(
            any(m["collectionKey"] == collection["key"] for m in word["memberships"])
            for word in payload["words"]
        )
        for collection in payload["collections"]
    }
    print(json.dumps({"uniqueWords": len(words), "memberships": membership_counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
