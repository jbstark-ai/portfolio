package main

type Creator struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	City        string   `json:"city"`
	Disciplines []string `json:"disciplines"`
	Hue         int      `json:"hue"`
	AskUSD      int      `json:"askUsd"`
	SharesOpen  int      `json:"sharesOpen"`
}

type Patron struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	BudgetUSD int    `json:"budgetUsd"`
}

type Match struct {
	CreatorID int  `json:"creatorId"`
	PatronID  int  `json:"patronId"`
	Mutual    bool `json:"mutual"`
}

// Store abstracts persistence so tests can use a JSON-backed fake.
type Store interface {
	Creators() ([]Creator, error)
	Creator(id int) (*Creator, error)
	Patron(id int) (*Patron, error)
	SaveSwipe(patronID, creatorID int, liked bool) error
	Matches(patronID int) ([]Match, error)
}
