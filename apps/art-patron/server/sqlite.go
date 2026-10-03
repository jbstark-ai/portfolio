package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

type SQLiteStore struct{ db *sql.DB }

func NewSQLiteStore(path string) (*SQLiteStore, error) {
	if path != ":memory:" {
		_ = os.MkdirAll(filepath.Dir(path), 0o755)
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS creators (id INTEGER PRIMARY KEY, name TEXT, city TEXT, disciplines TEXT, hue INTEGER, ask_usd INTEGER, shares_open INTEGER);
CREATE TABLE IF NOT EXISTS patrons (id INTEGER PRIMARY KEY, name TEXT, budget_usd INTEGER);
CREATE TABLE IF NOT EXISTS swipes (patron_id INTEGER, creator_id INTEGER, liked INTEGER, PRIMARY KEY (patron_id, creator_id));`)
	if err != nil {
		return nil, err
	}
	var n int
	_ = db.QueryRow(`SELECT COUNT(*) FROM creators`).Scan(&n)
	if n == 0 {
		seed := []Creator{
			{1, "Mei Lin", "Taipei", []string{"digital", "sculpture", "poetry"}, 340, 4000, 20},
			{2, "Joon Park", "Seoul", []string{"painting", "music"}, 210, 9000, 30},
			{3, "Aiko Sato", "Tokyo", []string{"mixedMedia", "fashion", "publishing"}, 20, 2500, 10},
			{4, "Wei Chen", "Shenzhen", []string{"textile", "electronics", "film"}, 280, 15000, 40},
			{5, "Soo-ah Kim", "Busan", []string{"installation", "performance"}, 45, 7000, 25},
		}
		for _, c := range seed {
			if _, err := db.Exec(`INSERT INTO creators VALUES (?,?,?,?,?,?,?)`, c.ID, c.Name, c.City, strings.Join(c.Disciplines, ","), c.Hue, c.AskUSD, c.SharesOpen); err != nil {
				return nil, err
			}
		}
		if _, err := db.Exec(`INSERT INTO patrons VALUES (1,'Demo Patron',8000)`); err != nil {
			return nil, err
		}
	}
	return &SQLiteStore{db}, nil
}

func scanCreator(sc interface{ Scan(...any) error }) (Creator, error) {
	var c Creator
	var d string
	err := sc.Scan(&c.ID, &c.Name, &c.City, &d, &c.Hue, &c.AskUSD, &c.SharesOpen)
	c.Disciplines = strings.Split(d, ",")
	return c, err
}

func (s *SQLiteStore) Creators() ([]Creator, error) {
	rows, err := s.db.Query(`SELECT id,name,city,disciplines,hue,ask_usd,shares_open FROM creators ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Creator{}
	for rows.Next() {
		c, err := scanCreator(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *SQLiteStore) Creator(id int) (*Creator, error) {
	c, err := scanCreator(s.db.QueryRow(`SELECT id,name,city,disciplines,hue,ask_usd,shares_open FROM creators WHERE id=?`, id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (s *SQLiteStore) Patron(id int) (*Patron, error) {
	var p Patron
	err := s.db.QueryRow(`SELECT id,name,budget_usd FROM patrons WHERE id=?`, id).Scan(&p.ID, &p.Name, &p.BudgetUSD)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (s *SQLiteStore) SaveSwipe(patronID, creatorID int, liked bool) error {
	_, err := s.db.Exec(`INSERT OR REPLACE INTO swipes VALUES (?,?,?)`, patronID, creatorID, liked)
	return err
}

func (s *SQLiteStore) Matches(patronID int) ([]Match, error) {
	rows, err := s.db.Query(`SELECT s.creator_id, p.budget_usd >= a.ask_usd FROM swipes s
JOIN creators a ON a.id = s.creator_id JOIN patrons p ON p.id = s.patron_id
WHERE s.patron_id=? AND s.liked=1 ORDER BY s.creator_id`, patronID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Match{}
	for rows.Next() {
		m := Match{PatronID: patronID}
		if err := rows.Scan(&m.CreatorID, &m.Mutual); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
