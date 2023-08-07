package main

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestIntegrationCRUDOperations(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().Topologies(mtest.ReplicaSet))
	defer mt.Close()

	// Get the database from the mtest context
	db := mt.DB("testdb")

	// Create UserRepository using the client
	repo := NewUserRepository(db.Client(), "testdb", "users")

	ctx := context.Background()

	// Create
	user := &User{
		Username:  "john_doe",
		Email:     "john@example.com",
		CreatedAt: time.Now(),
	}
	err := repo.Create(ctx, user)
	assert.NoError(t, err)
	assert.NotEmpty(t, user.ID)

	// Read
	readUser, err := repo.Read(ctx, user.ID)
	assert.NoError(t, err)
	assert.NotNil(t, readUser)
	assert.Equal(t, user.Username, readUser.Username)

	// Update
	updatedUsername := "jane_doe"
	readUser.Username = updatedUsername
	err = repo.Update(ctx, readUser)
	assert.NoError(t, err)

	// Read updated user
	updatedReadUser, err := repo.Read(ctx, user.ID)
	assert.NoError(t, err)
	assert.NotNil(t, updatedReadUser)
	assert.Equal(t, updatedUsername, updatedReadUser.Username)

	// Delete
	err = repo.Delete(ctx, user.ID)
	assert.NoError(t, err)

	// Verify deletion
	deletedUser, err := repo.Read(ctx, user.ID)
	assert.Error(t, err)
	assert.Nil(t, deletedUser)
}
