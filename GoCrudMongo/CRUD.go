package main

import (
	"context"
	"fmt"
	"log"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type User struct {
	ID        string    `bson:"_id,omitempty"`
	Name      string    `bson:"name"`
	Email     string    `bson:"email"`
	CreatedAt time.Time `bson:"created_at"`
}

var (
	dbName         = "your-db-name"
	collectionName = "users"
	connectionURI  = "mongodb://localhost:27017"
)

func createClient() (*mongo.Client, error) {
	clientOptions := options.Client().ApplyURI(connectionURI)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, err
	}
	err = client.Ping(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	return client, nil
}

func createUser(user User) error {
	client, err := createClient()
	if err != nil {
		return err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	_, err = collection.InsertOne(context.Background(), user)
	if err != nil {
		return err
	}

	return nil
}

func readUser(id string) (*User, error) {
	client, err := createClient()
	if err != nil {
		return nil, err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	filter := bson.M{"_id": id}

	var user User
	err = collection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func updateUser(id string, name string, email string) error {
	client, err := createClient()
	if err != nil {
		return err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"name":  name,
			"email": email,
		},
	}

	_, err = collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}

	return nil
}

func deleteUser(id string) error {
	client, err := createClient()
	if err != nil {
		return err
	}
	defer client.Disconnect(context.Background())

	collection := client.Database(dbName).Collection(collectionName)
	filter := bson.M{"_id": id}

	_, err = collection.DeleteOne(context.Background(), filter)
	if err != nil {
		return err
	}

	return nil
}

func TestCRUDOperations(t *testing.T) {
	// Create a user
	user := User{
		ID:        "1",
		Name:      "John Doe",
		Email:     "johndoe@example.com",
		CreatedAt: time.Now(),
	}
	err := createUser(user)
	if err != nil {
		log.Fatal(err)
	}

	// Read the user
	readUser, err := readUser(user.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Read user:", readUser)

	// Update the user
	err = updateUser(user.ID, "Jane Smith", "janesmith@example.com")
	if err != nil {
		log.Fatal(err)
	}

	// Read the updated user
	readUser, err = readUser(user.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Updated user:", readUser)

	// Delete the user
	err = deleteUser(user.ID)
	if err != nil {
		log.Fatal(err)
	}
}
