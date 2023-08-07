package crud

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestCRUDOperations(t *testing.T) {
	// Create mock objects
	mockSingleResult := new(MockSingleResult)
	mockCollection := new(MockCollection)
	mockDatabase := new(MockDatabase)
	mockClient := new(MockClient)

	// Set up mock interactions
	mockSingleResult.On("Decode", mock.AnythingOfType("*crud.User")).Return(nil)
	mockCollection.On("InsertOne", mock.Anything, mock.Anything, mock.Anything).Return(&mongo.InsertOneResult{}, nil)
	mockCollection.On("FindOne", mock.Anything, mock.Anything, mock.Anything).Return(mockSingleResult)
	mockCollection.On("UpdateOne", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&mongo.UpdateResult{}, nil)
	mockCollection.On("DeleteOne", mock.Anything, mock.Anything, mock.Anything).Return(&mongo.DeleteResult{}, nil)
	mockDatabase.On("Collection", mock.Anything).Return(mockCollection)
	mockClient.On("Disconnect", mock.Anything).Return(nil)
	mockClient.On("Database", mock.Anything).Return(mockDatabase)

	// Set up createClient to return the mock client
	clientFn := func(context.Context, ...*options.ClientOptions) (*mongo.Client, error) {
		return mockClient, nil
	}
	createClient = clientFn

	// Test Create
	user := User{
		ID:        "123",
		Name:      "John",
		Email:     "john@example.com",
		CreatedAt: time.Now(),
	}
	err := CreateUser(user)
	assert.NoError(t, err)

	// Test Read
	readUser, err := ReadUser("123")
	assert.NoError(t, err)
	assert.NotNil(t, readUser)
	assert.Equal(t, user.Name, readUser.Name)

	// Test Update
	err = UpdateUser("123", "Updated John", "updated@example.com")
	assert.NoError(t, err)

	// Test Delete
	err = DeleteUser("123")
	assert.NoError(t, err)

	// Verify mock interactions
	mockClient.AssertExpectations(t)
	mockDatabase.AssertExpectations(t)
	mockCollection.AssertExpectations(t)
	mockSingleResult.AssertExpectations(t)
}
