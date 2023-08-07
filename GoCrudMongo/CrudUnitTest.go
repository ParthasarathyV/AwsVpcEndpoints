package main

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/mock"
)

func TestCRUDOperations(t *testing.T) {
	mockClient := mock.NewClient()
	db := mockClient.Database("testdb")
	repo := NewUserRepository(db)

	// Create
	user := &User{
		Username:  "john_doe",
		Email:     "john@example.com",
		CreatedAt: time.Now(),
	}
	err := repo.Create(user)
	assert.NoError(t, err)
	assert.NotEmpty(t, user.ID)

	// Read
	readUser, err := repo.Read(user.ID)
	assert.NoError(t, err)
	assert.NotNil(t, readUser)
	assert.Equal(t, user.Username, readUser.Username)

	// Update
	updatedUsername := "jane_doe"
	readUser.Username = updatedUsername
	err = repo.Update(readUser)
	assert.NoError(t, err)

	// Read updated user
	updatedReadUser, err := repo.Read(user.ID)
	assert.NoError(t, err)
	assert.NotNil(t, updatedReadUser)
	assert.Equal(t, updatedUsername, updatedReadUser.Username)

	// Delete
	err = repo.Delete(user.ID)
	assert.NoError(t, err)

	// Verify deletion
	deletedUser, err := repo.Read(user.ID)
	assert.Error(t, err)
	assert.Nil(t, deletedUser)
}
