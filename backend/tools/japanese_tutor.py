import random
from typing import Dict, Any, List, Optional

# Comprehensive Database of Japanese for Academics, Distributed Systems, JLPT & Daily Living
JAPANESE_CURRICULUM = {
    "lab_keigo": [
        {
            "id": "keigo_1",
            "kanji": "研究室に所属させていただきたく存じます。",
            "hiragana": "けんきゅうしつに しょぞく させていただきたく ぞんじます。",
            "romaji": "Kenkyuushitsu ni shozoku sasete itadakitaku zonjimasu.",
            "meaning": "I humbly request permission to belong to / join your laboratory.",
            "category": "lab_keigo",
            "level": "Academic Keigo",
            "usage_tip": "Used in formal research proposal cover letters and during professor interviews."
        },
        {
            "id": "keigo_2",
            "kanji": "先生の論文を拝読いたしました。",
            "hiragana": "せんせいの ろんぶんを はいどく いたしました。",
            "romaji": "Sensei no ronbun o haidoku itashimashita.",
            "meaning": "I have had the profound honor of reading your research paper.",
            "category": "lab_keigo",
            "level": "Academic Keigo",
            "usage_tip": "拝読 (haidoku) is the humble (kenjougo) form of 読む (yomu)."
        },
        {
            "id": "keigo_3",
            "kanji": "研究計画書を添付いたしましたので、ご査収のほどお願い申し上げます。",
            "hiragana": "けんきゅう けいかくしょを てんぷ いたしましたので、ごさしゅうの ほど おねがい もうしあげます。",
            "romaji": "Kenkyuu keikakusho o tempu itashimashita node, gosashuu no hodo onegai moushiagemasu.",
            "meaning": "I have attached my research proposal, so I kindly request you to inspect and accept it.",
            "category": "lab_keigo",
            "level": "Academic Keigo",
            "usage_tip": "Standard formal email closing when submitting application documents."
        },
        {
            "id": "keigo_4",
            "kanji": "進捗状況をご報告いたします。",
            "hiragana": "しんちょく じょうきょうを ごほうこく いたします。",
            "romaji": "Shinchoku joukyou o go-houkoku itashimasu.",
            "meaning": "I would like to report my research progress.",
            "category": "lab_keigo",
            "level": "Academic Keigo",
            "usage_tip": "Used in weekly laboratory seminars (ゼミ / zemi)."
        },
        {
            "id": "keigo_5",
            "kanji": "先生のご都合のよろしい日時はございますでしょうか。",
            "hiragana": "せんせいの ごつごうの よろしい にちじは ございますでしょうか。",
            "romaji": "Sensei no gotsugou no yoroshii nichiji wa gozaimasu deshou ka.",
            "meaning": "Would there happen to be a convenient date and time for you, Professor?",
            "category": "lab_keigo",
            "level": "Academic Keigo",
            "usage_tip": "Polite inquiry when scheduling an online Zoom pre-consultation interview."
        }
    ],
    "tech_cs": [
        {
            "id": "tech_1",
            "kanji": "分散システム",
            "hiragana": "ぶんさん しすてむ",
            "romaji": "Bunsan shisutemu",
            "meaning": "Distributed Systems",
            "category": "tech_cs",
            "level": "Technical",
            "usage_tip": "Used when discussing distributed computing."
        },
        {
            "id": "tech_2",
            "kanji": "耐障害性",
            "hiragana": "たいしょうがいせい",
            "romaji": "Taishougaisei",
            "meaning": "Fault Tolerance / Reliability",
            "category": "tech_cs",
            "level": "Technical",
            "usage_tip": "Central research theme in dependable autonomous systems."
        },
        {
            "id": "tech_3",
            "kanji": "合意形成アルゴリズム",
            "hiragana": "ごうい けいせい あるごりずむ",
            "romaji": "Goui keisei arugorizumu",
            "meaning": "Consensus Formation Algorithm (e.g., Paxos, Raft, BFT)",
            "category": "tech_cs",
            "level": "Technical",
            "usage_tip": "Fundamental primitive for distributed state replication."
        },
        {
            "id": "tech_4",
            "kanji": "自己適応型ソフトウェア",
            "hiragana": "じこ てきおうがた そふとうぇあ",
            "romaji": "Jiko tekiou-gata sofutowea",
            "meaning": "Self-Adaptive Software (MAPE-K feedback loop)",
            "category": "tech_cs",
            "level": "Technical",
            "usage_tip": "Prof. Kenji Tei's primary research domain at Science Tokyo."
        },
        {
            "id": "tech_5",
            "kanji": "並行処理",
            "hiragana": "へいこう しょり",
            "romaji": "Heikou shori",
            "meaning": "Concurrent Processing / Concurrency",
            "category": "tech_cs",
            "level": "Technical",
            "usage_tip": "Handling multithreading, asynchronous event loops, and coroutines."
        }
    ],
    "jlpt_n5_n4": [
        {
            "id": "jlpt_1",
            "kanji": "〜ことができます",
            "hiragana": "〜ことが できます",
            "romaji": "... koto ga dekimasu",
            "meaning": "Can do / Able to [verb]",
            "category": "jlpt_n5_n4",
            "level": "JLPT N5",
            "usage_tip": "Dictionary form + ことができます (e.g., 日本語を話すことができます)."
        },
        {
            "id": "jlpt_2",
            "kanji": "〜てください",
            "hiragana": "〜て ください",
            "romaji": "... te kudasai",
            "meaning": "Please do [verb]",
            "category": "jlpt_n5_n4",
            "level": "JLPT N5",
            "usage_tip": "Te-form + ください. Used for polite instructions and requests."
        },
        {
            "id": "jlpt_3",
            "kanji": "〜なければなりません",
            "hiragana": "〜なければ なりません",
            "romaji": "... nakereba narimasen",
            "meaning": "Must do / Have to do [verb]",
            "category": "jlpt_n5_n4",
            "level": "JLPT N4",
            "usage_tip": "Negative nai-stem + ければなりません. Crucial for visa/exam rules."
        },
        {
            "id": "jlpt_4",
            "kanji": "〜たらどうですか",
            "hiragana": "〜たら どうですか",
            "romaji": "... tara dou desu ka",
            "meaning": "Why don't you do / How about doing [verb]?",
            "category": "jlpt_n5_n4",
            "level": "JLPT N4",
            "usage_tip": "Ta-form + らどうですか. Used for giving gentle suggestions."
        }
    ],
    "daily_life": [
        {
            "id": "life_1",
            "kanji": "在留カード",
            "hiragana": "ざいりゅう かーど",
            "romaji": "Zairyuu kaado",
            "meaning": "Residence Card",
            "category": "daily_life",
            "level": "Life in Japan",
            "usage_tip": "Issued at Narita/Haneda airport upon entry on Student Visa; carry at all times."
        },
        {
            "id": "life_2",
            "kanji": "市役所で住民登録をします。",
            "hiragana": "しやくしょで じゅうみん とうろくを します。",
            "romaji": "Shiyakusho de juumin touroku o shimasu.",
            "meaning": "Registering residency at the City / Ward Office.",
            "category": "daily_life",
            "level": "Life in Japan",
            "usage_tip": "Must be done within 14 days of moving into student dorm/apartment."
        },
        {
            "id": "life_3",
            "kanji": "銀行口座を開設したいのですが。",
            "hiragana": "ぎんこう こうざを かいせつ したいのですが。",
            "romaji": "Ginkou kouza o kaisetsu shitai no desu ga.",
            "meaning": "I would like to open a bank account (e.g., Japan Post Bank / Yucho).",
            "category": "daily_life",
            "level": "Life in Japan",
            "usage_tip": "Take residence card, passport, and student ID to Yucho Bank."
        },
        {
            "id": "life_4",
            "kanji": "学生証",
            "hiragana": "がくせいしょう",
            "romaji": "Gakuseishou",
            "meaning": "Student ID Card",
            "category": "daily_life",
            "level": "Life in Japan",
            "usage_tip": "Used for commuter pass discounts (Teikiken) on JR and Tokyo Metro."
        }
    ]
}

def get_all_flashcards(category: Optional[str] = None) -> List[Dict[str, Any]]:
    if category and category in JAPANESE_CURRICULUM:
        return JAPANESE_CURRICULUM[category]
    all_cards = []
    for cat_list in JAPANESE_CURRICULUM.values():
        all_cards.extend(cat_list)
    return all_cards

def get_random_card(category: Optional[str] = None) -> Dict[str, Any]:
    cards = get_all_flashcards(category)
    return random.choice(cards)

def generate_quiz_question(category: Optional[str] = None) -> Dict[str, Any]:
    cards = get_all_flashcards(category)
    if len(cards) < 4:
        target = cards[0]
        options = [target["meaning"]]
    else:
        target = random.choice(cards)
        distractors = [c["meaning"] for c in cards if c["id"] != target["id"]]
        random.shuffle(distractors)
        options = [target["meaning"]] + distractors[:3]
        random.shuffle(options)

    return {
        "question_id": target["id"],
        "prompt_kanji": target["kanji"],
        "prompt_hiragana": target["hiragana"],
        "prompt_romaji": target["romaji"],
        "category": target["category"],
        "correct_answer": target["meaning"],
        "options": options,
        "usage_tip": target["usage_tip"]
    }

