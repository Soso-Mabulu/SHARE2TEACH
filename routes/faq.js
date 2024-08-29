const express = require('express');
const router = express.Router();
const connect = require('../config/db');
const sql = require('mssql');

// Get all FAQs
router.get('/', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT * FROM FAQ');
    res.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Search FAQs
router.get('/search/:term', async (req, res) => {
  const { term } = req.params;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('term', sql.NVarChar, `%${term}%`)
      .query('SELECT * FROM FAQ WHERE question LIKE @term OR answer LIKE @term');
    res.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Get a single FAQ by ID
router.get('/:faqId', async (req, res) => {
  const { faqId } = req.params;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('faqId', sql.Int, faqId)
      .query('SELECT * FROM FAQ WHERE faqId = @faqId');
    if (result.recordset.length === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Create a new FAQ
router.post('/', async (req, res) => {
  const { question, answer } = req.body;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('question', sql.NVarChar, question)
      .input('answer', sql.NVarChar, answer)
      .query('INSERT INTO FAQ (question, answer) VALUES (@question, @answer); SELECT SCOPE_IDENTITY() AS id');
    res.status(201).json({ id: result.recordset[0].id, question, answer });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Update an FAQ
router.put('/:faqId', async (req, res) => {
  const { faqId } = req.params;
  const { question, answer } = req.body;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('faqId', sql.Int, faqId)
      .input('question', sql.NVarChar, question)
      .input('answer', sql.NVarChar, answer)
      .query('UPDATE FAQ SET question = @question, answer = @answer WHERE faqId = @faqId');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.json({ faqId, question, answer });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Delete an FAQ
router.delete('/:faqId', async (req, res) => {
  const { faqId } = req.params;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('faqId', sql.Int, faqId)
      .query('DELETE FROM FAQ WHERE faqId = @faqId');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

module.exports = router;
