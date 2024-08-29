app.route('/files/:fileId/review')
  .get(checkModeratorAccess, async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      if (!file) return res.status(404).send('File not found');

      // Retrieve additional file details (metadata) from Azure Blob if needed
      const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
      const blobClient = containerClient.getBlobClient(file.name);
      const fileMetadata = await blobClient.getProperties(); // Get metadata only

      res.json({ file, fileMetadata });
    } catch (err) {
      if (err.name === 'MongooseError') {
        res.status(500).send('Error retrieving file details from database');
      } else if (err.name === 'RangeError' || err.name === 'TypeError') {
        // Handle potential errors during download
        res.status(500).send('Error retrieving file details from storage');
      } else {
        console.error('Unexpected error:', err);
        res.status(500).send('Internal server error');
      }
    }
  })
  .put(checkModeratorAccess, async (req, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).send('Invalid status');
      }

      const file = await File.findById(req.params.fileId);
      if (!file) return res.status(404).send('File not found');

      file.status = status;
      await file.save();

      // Log the moderation action
      const moderationLog = new ModerationLog({
        fileId: file._id,
        moderatorId: req.user.id,
        action: status,
        timestamp: new Date(),
      });
      await moderationLog.save();

      res.json({ message: `File ${status}` });
    } catch (err) {
      if (err.name === 'MongooseError') {
        res.status(500).send('Error updating file status in database');
      } else {
        console.error('Unexpected error:', err);
        res.status(500).send('Internal server error');
      }
    }
  });