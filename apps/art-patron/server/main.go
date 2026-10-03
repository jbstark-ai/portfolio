package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	path := os.Getenv("DB_FILE")
	if path == "" {
		path = "data/art.db"
	}
	store, err := NewSQLiteStore(path)
	if err != nil {
		log.Fatal(err)
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Println("API on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, NewHandler(store)))
}
