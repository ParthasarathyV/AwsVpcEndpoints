package crud

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockCollection struct {
	mock.Mock
}

func (m *MockCollection) InsertOne(ctx context.Context, document interface{}, opts ...*options.InsertOneOptions) (*mongo.InsertOneResult, error) {
	args := m.Called(ctx, document, opts)
	return args.Get(0).(*mongo.InsertOneResult), args.Error(1)
}

func (m *MockCollection) FindOne(ctx context.Context, filter interface{}, opts ...*options.FindOneOptions) SingleResult {
	args := m.Called(ctx, filter, opts)
	return args.Get(0).(SingleResult)
}

func (m *MockCollection) UpdateOne(ctx context.Context, filter interface{}, update interface{}, opts ...*options.UpdateOptions) (*mongo.UpdateResult, error) {
	args := m.Called(ctx, filter, update, opts)
	return args.Get(0).(*mongo.UpdateResult), args.Error(1)
}

func (m *MockCollection) DeleteOne(ctx context.Context, filter interface{}, opts ...*options.DeleteOptions) (*mongo.DeleteResult, error) {
	args := m.Called(ctx, filter, opts)
	return args.Get(0).(*mongo.DeleteResult), args.Error(1)
}

type MockSingleResult struct {
	mock.Mock
}

func (m *MockSingleResult) Decode(v interface{}) error {
	args := m.Called(v)
	return args.Error(0)
}

func TestCRUDOperations(t *testing.T) {
	mockSingleResult := new(MockSingleResult)
	mockCollection := new(MockCollection)

	user := User{
		ID:        "123",
		Name:      "John",
		Email:     "john@example.com",
		CreatedAt: time.Now(),
	}

	// Set up Create mock
	mockCollection.On("InsertOne", mock.Anything, mock.Anything, mock.Anything).Return(&mongo.InsertOneResult{}, nil)

	// Set up Read mock
	mockSingleResult.On("Decode", mock.AnythingOfType("*crud.User")).Run(func(args mock.Arguments) {
		ptr := args.Get(0).(*User)
		*ptr = user
	}).Return(nil)
	mockCollection.On("FindOne", mock.Anything, mock.Anything, mock.Anything).Return(mockSingleResult)

	// Set up Update mock
	mockCollection.On("UpdateOne", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&mongo.UpdateResult{}, nil)

	// Set up Delete mock
	mockCollection.On("DeleteOne", mock.Anything, mock.Anything, mock.Anything).Return(&mongo.DeleteResult{}, nil)

	createClient = func() (*mongo.Client, error) {
		return &mongo.Client{}, nil
	}

	service := &MongoDBService{collection: mockCollection}

	// Test Create
	err := service.Create(user)
	assert.NoError(t, err)

	// Test Read
	readUser, err := service.Read(user.ID)
	assert.NoError(t, err)
	assert.NotNil(t, readUser)
	assert.Equal(t, user.Name, readUser.Name)

	// Test Update
	err = service.Update(user.ID, "Updated John", "updated@example.com")
	assert.NoError(t, err)

	// Test Delete
	err = service.Delete(user.ID)
	assert.NoError(t, err)

	mockCollection.AssertExpectations(t)
	mockSingleResult.AssertExpectations(t)
}
