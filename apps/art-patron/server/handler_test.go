package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// jsonStore is a Store backed by testdata/fixtures.json.
type jsonStore struct {
	creators []Creator
	patrons  []Patron
	swipes   map[[2]int]bool
}

func loadJSONStore(t *testing.T) *jsonStore {
	t.Helper()
	raw, err := os.ReadFile("testdata/fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var f struct {
		Creators []Creator `json:"creators"`
		Patrons  []Patron  `json:"patrons"`
	}
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatal(err)
	}
	return &jsonStore{f.Creators, f.Patrons, map[[2]int]bool{}}
}

func (j *jsonStore) Creators() ([]Creator, error) { return j.creators, nil }
func (j *jsonStore) Creator(id int) (*Creator, error) {
	for i := range j.creators {
		if j.creators[i].ID == id {
			return &j.creators[i], nil
		}
	}
	return nil, nil
}
func (j *jsonStore) Patron(id int) (*Patron, error) {
	for i := range j.patrons {
		if j.patrons[i].ID == id {
			return &j.patrons[i], nil
		}
	}
	return nil, nil
}
func (j *jsonStore) SaveSwipe(p, a int, liked bool) error { j.swipes[[2]int{p, a}] = liked; return nil }
func (j *jsonStore) Matches(p int) ([]Match, error) {
	out := []Match{}
	for k, liked := range j.swipes {
		if k[0] == p && liked {
			out = append(out, Match{CreatorID: k[1], PatronID: p})
		}
	}
	return out, nil
}

func post(h http.Handler, body string) *httptest.ResponseRecorder {
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest("POST", "/api/swipes", strings.NewReader(body)))
	return rr
}

func TestListCreators(t *testing.T) {
	rr := httptest.NewRecorder()
	NewHandler(loadJSONStore(t)).ServeHTTP(rr, httptest.NewRequest("GET", "/api/creators", nil))
	var got []Creator
	_ = json.Unmarshal(rr.Body.Bytes(), &got)
	if len(got) != 2 {
		t.Fatalf("want 2 creators, got %d", len(got))
	}
}

func TestSwipeMutualWhenBudgetCoversAsk(t *testing.T) {
	h := NewHandler(loadJSONStore(t))
	var m Match
	_ = json.Unmarshal(post(h, `{"patronId":1,"creatorId":1,"liked":true}`).Body.Bytes(), &m)
	if !m.Mutual {
		t.Fatal("expected mutual match")
	}
	_ = json.Unmarshal(post(h, `{"patronId":1,"creatorId":2,"liked":true}`).Body.Bytes(), &m)
	if m.Mutual {
		t.Fatal("expected no match above budget")
	}
}

func TestSwipeValidation(t *testing.T) {
	h := NewHandler(loadJSONStore(t))
	if c := post(h, `nope`).Code; c != 400 {
		t.Fatalf("want 400, got %d", c)
	}
	if c := post(h, `{"patronId":9,"creatorId":1,"liked":true}`).Code; c != 404 {
		t.Fatalf("want 404, got %d", c)
	}
}

func TestSQLiteStoreRoundTrip(t *testing.T) {
	s, err := NewSQLiteStore(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	h := NewHandler(s)
	post(h, `{"patronId":1,"creatorId":1,"liked":true}`)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest("GET", "/api/patrons/1/matches", nil))
	var ms []Match
	_ = json.Unmarshal(rr.Body.Bytes(), &ms)
	if len(ms) != 1 || !ms[0].Mutual {
		t.Fatalf("unexpected matches: %s", rr.Body.String())
	}
}
