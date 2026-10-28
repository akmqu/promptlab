from app.schemas import ExampleOut

EXAMPLES: list[ExampleOut] = [
    ExampleOut(
        id="ex-01",
        title="Napisz mi maila do klienta",
        category="Pisanie",
        weak_prompt="Napisz mi maila do klienta",
        description="Brakuje odbiorcy, celu wiadomości i oczekiwanego tonu.",
    ),
    ExampleOut(
        id="ex-02",
        title="Zrób plan marketingowy",
        category="Marketing",
        weak_prompt="Zrób plan marketingowy dla nowej aplikacji",
        description="Nie wiadomo, dla jakiego produktu, rynku i horyzontu czasowego.",
    ),
    ExampleOut(
        id="ex-03",
        title="Wyjaśnij mi ten kod",
        category="Programowanie",
        weak_prompt="Wyjaśnij mi ten kod",
        description="Brak fragmentu kodu, poziomu odbiorcy i celu wyjaśnienia.",
    ),
    ExampleOut(
        id="ex-04",
        title="Napisz post na LinkedIn",
        category="Marketing",
        weak_prompt="Napisz post na LinkedIn o produktywności",
        description="Brak grupy docelowej, długości i pożądanego CTA.",
    ),
    ExampleOut(
        id="ex-05",
        title="Przygotuj lekcję",
        category="Edukacja",
        weak_prompt="Przygotuj lekcję o fotosyntezie",
        description="Nie określono poziomu uczniów, czasu trwania ani efektów uczenia.",
    ),
    ExampleOut(
        id="ex-06",
        title="Zaplanuj dzień pracy",
        category="Produktywność",
        weak_prompt="Zaplanuj mi dzień pracy",
        description="Brakuje listy zadań, priorytetów i ograniczeń czasowych.",
    ),
    ExampleOut(
        id="ex-07",
        title="Przetłumacz tekst",
        category="Tłumaczenie",
        weak_prompt="Przetłumacz to na angielski",
        description="Brak tekstu źródłowego, rejestru językowego i kontekstu użycia.",
    ),
    ExampleOut(
        id="ex-08",
        title="Zrób prezentację",
        category="Prezentacje",
        weak_prompt="Zrób prezentację o wynikach sprzedaży",
        description="Nie podano odbiorców, liczby slajdów ani kluczowych wniosków.",
    ),
    ExampleOut(
        id="ex-09",
        title="Zaplanuj wyjazd",
        category="Planowanie",
        weak_prompt="Zaplanuj wyjazd do Krakowa",
        description="Brak liczby osób, budżetu, dat i preferencji.",
    ),
    ExampleOut(
        id="ex-10",
        title="Napisz opis stanowiska",
        category="Pisanie",
        weak_prompt="Napisz ogłoszenie o pracę dla juniora",
        description="Brak branży, obowiązków, wymagań i lokalizacji.",
    ),
]


def list_examples(query: str | None = None, category: str | None = None) -> list[ExampleOut]:
    items = EXAMPLES
    if category and category.lower() != "wszystkie":
        items = [e for e in items if e.category.lower() == category.lower()]
    if query:
        q = query.lower().strip()
        items = [
            e
            for e in items
            if q in e.title.lower() or q in e.weak_prompt.lower() or q in e.description.lower()
        ]
    return items
