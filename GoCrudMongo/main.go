// main.go

package main

import (
	"fmt"
	"log"
	"time"

	"github.com/your-username/mycrudapp/crud"
)

func main() {
	newUser := crud.User{
		ID:        "user-123",         // Replace with an actual user ID
		Name:      "John Doe",
		Email:     "john@example.com",
		CreatedAt: time.Now(),
	}

	err := crud.CreateUser(newUser)
	if err != nil {
		log.Fatal("Error creating user:", err)
	}
	fmt.Println("User created successfully")

	readUserID := "user-123" // Replace with an actual user ID
	readUser, err := crud.ReadUser(readUserID)
	if err != nil {
		log.Fatal("Error reading user:", err)
	}
	fmt.Println("Read user:", readUser)

	newName := "Jane Doe"
	newEmail := "jane@example.com"
	err = crud.UpdateUser(readUserID, newName, newEmail)
	if err != nil {
		log.Fatal("Error updating user:", err)
	}
	fmt.Println("User updated successfully")

	err = crud.DeleteUser(readUserID)
	if err != nil {
		log.Fatal("Error deleting user:", err)
	}
	fmt.Println("User deleted successfully")
}
