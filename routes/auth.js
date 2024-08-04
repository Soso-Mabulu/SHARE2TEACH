const express = require('express');
const router = express.Router();
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { cognito } = require('../config');
const db = require('../config/db'); // Adjust the path based on actual location

const userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: cognito.UserPoolId,
    ClientId: cognito.ClientId,
});

// Helper function to insert user into MySQL database
const insertUserIntoDB = async (email, userName, userLName) => {
    const sql = 'INSERT INTO User (email, userName, userLName, userType) VALUES (?, ?, ?, ?)';
    const values = [email, userName, userLName, 'default']; // 'default' is the default user type
    return new Promise((resolve, reject) => {
        db.query(sql, values, (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    });
};

// User Sign-Up
router.post('/register', async (req, res) => {
    const { email, password, userName, userLName } = req.body;

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'email',
            Value: email,
        }),
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'name',
            Value: userName,
        }),
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'family_name',
            Value: userLName,
        }),
    ];

    userPool.signUp(email, password, attributeList, null, async (err, result) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        // Insert user data into MySQL database
        try {
            await insertUserIntoDB(email, userName, userLName);
            res.status(200).json({ message: 'User signed up successfully', user: result.user });
        } catch (dbErr) {
            res.status(500).json({ error: 'Error saving user to database' });
        }
    });
});

// User Sign-In
router.post('/signin', (req, res) => {
    const { email, password } = req.body;

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password,
    });

    const userData = {
        Username: email,
        Pool: userPool,
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            const idToken = result.getIdToken().getJwtToken();
            res.status(200).json({ message: 'Sign in successful', token: idToken });
        },
        onFailure: (err) => {
            res.status(400).json({ error: err.message });
        },
    });
});

module.exports = router;
