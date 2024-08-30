app.route('/files/:fileId/review')
  .get(checkModeratorAccess, async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      if (!file) return res.status(404).send('File not found');

      // Retrieve additional file details (metadata) from Azure Blob if needed
      const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
      const blobClient = containerClient.getBlobClient(file.name);
      let fileMetadata;
      try {
        fileMetadata = await blobClient.getProperties();
      } catch (err) {
        console.error('Error retrieving file metadata:', err);
        return res.status(500).send('Error retrieving file details from storage');
      }

      res.json({ file, fileMetadata, review: file.review }); // Include review data if applicable
    } catch (err) {
      if (err.name === 'MongooseError') {
        res.status(500).send('Error retrieving file details from database');
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

      // Log the moderation action asynchronously (using promises or callbacks)
      const moderationLog = new ModerationLog({
        fileId: file._id,
        moderatorId: req.user.id,
        action: status,
        timestamp: new Date(),
      });
      moderationLog.save().then(() => console.log('Moderation log saved successfully')).catch(err => console.error('Error saving moderation log:', err));

      res.json({ message: `File "${file.name}" has been ${status}` });
    } catch (err) {
      if (err.name === 'MongooseError') {
        res.status(500).send('Error updating file status in database');
      } else {
        console.error('Unexpected error:', err);
        res.status(500).send('Internal server error');
      }
    }
  });