package crud

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockClient struct {
	mock.Mock
}

func (m *MockClient) Disconnect(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockClient) Database(name string) Database {
	return &MockDatabase{Mock: &m.Mock}
}

type MockDatabase struct {
	mock.Mock
}

func (m *MockDatabase) Collection(name string) Collection {
	return &MockCollection{Mock: &m.Mock}
}

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
	mockSingleResult.On("Decode", mock.AnythingOfType("*crud.User")).Return(nil)

	mockCollection := new(MockCollection)
	mockCollection.On("InsertOne", mock.Anything, mock.Anything, mock.Anything).Return(&mongo.InsertOneResult{}, nil)
	mockCollection.On("FindOne", mock.Anything, mock.Anything, mock.Anything).Return(mockSingleResult)
	mockCollection.On("UpdateOne", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&mongo.UpdateResult{}, nil)
	mockCollection.On("DeleteOne", mock.Anything, mock.Anything, mock.Anything).Return(&mongo.DeleteResult{}, nil)

	mockDatabase := new(MockDatabase)
	mockDatabase.On("Collection", collectionName).Return(mockCollection)

	mockClient := new(MockClient)
	mockClient.On("Disconnect", mock.Anything).Return(nil)
	mockClient.On("Database", dbName).Return(mockDatabase)

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

	mockClient.AssertExpectations(t)
	mockDatabase.AssertExpectations(t)
	mockCollection.AssertExpectations(t)
	mockSingleResult.AssertExpectations(t)
}

