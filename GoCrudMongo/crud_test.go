package crud

import (
	"log"
	"testing"
	"time"
)

func TestCRUDOperations(t *testing.T) {
	// Create a user
	user := User{
		ID:        "1",
		Name:      "John Doe",
		Email:     "johndoe@example.com",
		CreatedAt: time.Now(),
	}
	err := CreateUser(user)
	if err != nil {
		log.Fatal(err)
	}

	// Read the user
	readUser, err := ReadUser(user.ID)
	if err != nil {
		log.Fatal(err)
	}
	t.Logf("Read user: %+v", readUser)

	// Update the user
	err = UpdateUser(user.ID, "Jane Smith", "janesmith@example.com")
	if err != nil {
		log.Fatal(err)
	}

	// Read the updated user
	updatedUser, err := ReadUser(user.ID)
	if err != nil {
		log.Fatal(err)
	}
	t.Logf("Updated user: %+v", updatedUser)

	// Delete the user
	err = DeleteUser(user.ID)
	if err != nil {
		log.Fatal(err)
	}
}
