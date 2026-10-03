package main

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func NewHandler(s Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/creators", func(w http.ResponseWriter, r *http.Request) {
		a, err := s.Creators()
		reply(w, a, err)
	})

	mux.HandleFunc("GET /api/patrons/{id}/matches", func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.Atoi(r.PathValue("id"))
		m, err := s.Matches(id)
		reply(w, m, err)
	})

	mux.HandleFunc("POST /api/swipes", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			PatronID  int  `json:"patronId"`
			CreatorID int  `json:"creatorId"`
			Liked     bool `json:"liked"`
		}
		if json.NewDecoder(r.Body).Decode(&in) != nil {
			http.Error(w, `{"error":"bad_request"}`, http.StatusBadRequest)
			return
		}
		p, err := s.Patron(in.PatronID)
		if err != nil {
			reply(w, nil, err)
			return
		}
		a, err := s.Creator(in.CreatorID)
		if err != nil {
			reply(w, nil, err)
			return
		}
		if p == nil || a == nil {
			http.Error(w, `{"error":"not_found"}`, http.StatusNotFound)
			return
		}
		if err := s.SaveSwipe(p.ID, a.ID, in.Liked); err != nil {
			reply(w, nil, err)
			return
		}
		// A like becomes a mutual match when the patron can cover the artist's ask.
		reply(w, Match{CreatorID: a.ID, PatronID: p.ID, Mutual: in.Liked && p.BudgetUSD >= a.AskUSD}, nil)
	})

	return cors(mux)
}

func reply(w http.ResponseWriter, v any, err error) {
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal"})
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
