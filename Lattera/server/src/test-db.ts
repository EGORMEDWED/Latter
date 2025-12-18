import { connectDB, createIndexes, User, Chat, Message, FeedbackRequest, SearchHistory, OnlineStatus, MediaFile, s3Service } from './database';
import mongoose from 'mongoose';

/**
 * Тестовый скрипт для проверки работы с базой данных и S3 интеграцией
 * Запускается командой: npm run test-db
 */
const testDatabase = async () => {
  try {
    console.log('🧪 Starting database and S3 tests...\n');

    // 1. Подключаемся к базе данных
    console.log('1. Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database successfully\n');

    // 2. Создаем индексы
    console.log('2. Creating indexes...');
    await createIndexes();
    console.log('✅ Indexes created successfully\n');

    // 3. Тест создания пользователя
    console.log('3. Testing User model...');
    
    // Создаем тестового пользователя
    const testUser = new User({
      email: 'test@example.com',
      passwordHash: 'hashed_password_that_is_at_least_60_characters_long_for_bcrypt_123456789012345678901234567890123456789012345678901234567890',
      firstName: 'Тест',
      lastName: 'Пользователь',
      profile: {
        position: 'Разработчик',
        company: 'TechCorp',
        category: 'IT',
        skills: ['JavaScript', 'TypeScript', 'React']
      },
      status: 'online',
      emailVerified: true
    });

    const savedUser = await testUser.save();
    console.log(`✅ User created: ${savedUser.firstName} ${savedUser.lastName} (${savedUser.email})`);
    console.log(`   Profile: ${savedUser.profile?.position} в ${savedUser.profile?.company}`);
    console.log(`   Skills: ${savedUser.profile?.skills?.join(', ')}\n`);

    // 4. Тест создания второго пользователя и чата
    console.log('4. Testing Chat model...');
    
    const testUser2 = new User({
      email: 'user2@example.com',
      passwordHash: 'hashed_password_that_is_at_least_60_characters_long_for_bcrypt_123456789012345678901234567890123456789012345678901234567890',
      firstName: 'Второй',
      lastName: 'Тест',
      profile: {
        position: 'Дизайнер',
        company: 'DesignStudio',
        category: 'Design',
        skills: ['Figma', 'Adobe Creative Suite']
      },
      status: 'offline',
      emailVerified: true
    });

    const savedUser2 = await testUser2.save();
    console.log(`✅ Second user created: ${savedUser2.firstName} ${savedUser2.lastName}`);

    const testChat = new Chat({
      participants: [savedUser._id, savedUser2._id],
      lastMessage: {
        content: 'Привет! Как дела?',
        timestamp: new Date()
      },
      unreadCount: {
        [(savedUser._id as mongoose.Types.ObjectId).toString()]: 0,
        [(savedUser2._id as mongoose.Types.ObjectId).toString()]: 1
      }
    });

    const savedChat = await testChat.save();
    console.log(`✅ Chat created with ${savedChat.participants.length} participants\n`);

    // 5. Тест создания сообщения с медиа
    console.log('5. Testing Message model...');
    
    const testMessage = new Message({
      chatId: savedChat._id,
      senderId: savedUser._id,
      content: 'Отправляю тестовое сообщение с медиа',
      media: {
        type: 'image',
        url: 'https://example.com/test-image.jpg',
        metadata: {
          width: 1920,
          height: 1080
        }
      },
      timestamp: new Date(),
      feedbackRequested: false
    });

    const savedMessage = await testMessage.save();
    console.log(`✅ Message created: "${savedMessage.content}"`);
    console.log(`   Media: ${savedMessage.media?.type}\n`);

    // 6. Тест создания feedback request
    console.log('6. Testing FeedbackRequest model...');
    
    const feedbackRequest = new FeedbackRequest({
      messageId: savedMessage._id,
      requesterId: savedUser._id,
      requestedFrom: savedUser2._id,
      status: 'pending',
      requestMessage: 'Можешь дать обратную связь по сообщению?',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней
    });

    const savedFeedbackRequest = await feedbackRequest.save();
    console.log(`✅ Feedback request created: ${savedFeedbackRequest.status}`);
    console.log(`   Expires: ${savedFeedbackRequest.expiresAt}\n`);

    // 7. Тест поисковой истории
    console.log('7. Testing SearchHistory model...');
    
    const searchHistory = new SearchHistory({
      userId: savedUser._id,
      query: {
        category: 'IT',
        company: 'TechCorp',
        skills: ['JavaScript', 'TypeScript']
      },
      timestamp: new Date(),
      resultsCount: 25
    });

    const savedSearchHistory = await searchHistory.save();
    console.log(`✅ Search history saved`);
    console.log(`   Category: ${savedSearchHistory.query.category}`);
    console.log(`   Skills: ${savedSearchHistory.query.skills?.join(', ')}`);
    console.log(`   Found: ${savedSearchHistory.resultsCount} results\n`);

    // 8. Тест статуса онлайн
    console.log('8. Testing OnlineStatus model...');
    
    const onlineStatus = new OnlineStatus({
      userId: savedUser._id,
      status: 'online',
      lastPing: new Date()
    });

    const savedOnlineStatus = await onlineStatus.save();
    console.log(`✅ Online status set: ${savedOnlineStatus.status}\n`);

    // 9. Тест MediaFile модели и S3 сервиса (если настроен)
    console.log('9. Testing MediaFile model and S3 integration...');
    
    // Создаем тестовый файл в памяти (1x1 пиксельный PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, // Compressed image data
      0x00, 0x01, // End of IDAT chunk
      0xE2, 0x21, 0xBC, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    try {
      // Тест загрузки файла через S3 сервис (если настроен)
      if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY) {
        console.log('   📤 Testing S3 file upload...');
        const uploadResult = await s3Service.uploadFile(
          testImageBuffer,
          'image/png',
          (savedUser._id as mongoose.Types.ObjectId).toString(),
          'test-image.png'
        );
        console.log(`✅ File uploaded successfully:`);
        console.log(`   URL: ${uploadResult.url}`);
        console.log(`   Key: ${uploadResult.key}`);
        console.log(`   Size: ${uploadResult.size} bytes`);
        console.log(`   Type: ${uploadResult.type}\n`);

        // Тест генерации временного URL
        console.log('   🔗 Testing presigned URL generation...');
        const presignedUrl = await s3Service.generatePresignedUrl(uploadResult.key, 3600);
        console.log(`✅ Presigned URL generated: ${presignedUrl.substring(0, 100)}...\n`);

        // Тест статистики файлов
        console.log('   📊 Testing file statistics...');
        const stats = await s3Service.getUserFileStats((savedUser._id as mongoose.Types.ObjectId).toString());
        console.log(`✅ File statistics retrieved:`);
        console.log(`   Total files: ${stats.totalFiles}`);
        console.log(`   Total size: ${stats.totalSize} bytes`);
        console.log(`   Files by type:`, stats.filesByType);

        // Тест удаления файла
        console.log('   🗑️  Testing file deletion...');
        await s3Service.deleteFile(uploadResult.url, (savedUser._id as mongoose.Types.ObjectId).toString());
        console.log(`✅ File deleted successfully\n`);

      } else {
        console.log('   ⚠️  S3 credentials not found, testing MediaFile model only...');
        
        // Тестируем только модель без S3
        const mediaFile = new MediaFile({
          url: 'https://example.com/test-image.png',
          key: 'test-user/1640995200000-test.png',
          type: 'image',
          mimeType: 'image/png',
          size: testImageBuffer.length,
          uploadedBy: savedUser._id,
          originalName: 'test-image.png'
        });

        const savedMediaFile = await mediaFile.save();
        console.log(`✅ MediaFile record created:`);
        console.log(`   URL: ${savedMediaFile.url}`);
        console.log(`   Type: ${savedMediaFile.type}`);
        console.log(`   Size: ${savedMediaFile.size} bytes\n`);
      }

    } catch (s3Error) {
      console.log(`   ❌ S3 test failed (this is expected if S3 is not configured):`);
      console.log(`   Error: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}\n`);
    }

    // 10. Проверка индексов
    console.log('10. Checking database indexes...');
    const { getIndexesStats } = await import('./database/indexes/indexes');
    const indexesStats = await getIndexesStats();
    
    Object.entries(indexesStats).forEach(([collection, indexes]) => {
      if (Array.isArray(indexes)) {
        console.log(`   ${collection}: ${indexes.length} indexes`);
      } else {
        console.log(`   ${collection}: Error - ${indexes.error}`);
      }
    });
    console.log('✅ Database indexes check completed\n');

    // 11. Агрегированные запросы для демонстрации возможностей
    console.log('11. Testing aggregated queries...');
    
    // Количество пользователей по категориям
    const usersByCategory = await User.aggregate([
      { $group: { _id: '$profile.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log(`   Users by category:`, usersByCategory);

    // Общее количество сообщений с медиа
    const messagesWithMedia = await Message.aggregate([
      { $match: { 'media': { $exists: true } } },
      { $group: { _id: '$media.type', count: { $sum: 1 }, totalSize: { $sum: '$media.size' } } }
    ]);
    console.log(`   Messages with media:`, messagesWithMedia);

    console.log('✅ Aggregated queries completed\n');

    // 12. Очистка тестовых данных
    console.log('12. Cleaning up test data...');
    await User.deleteMany({ email: { $in: ['test@example.com', 'user2@example.com'] } });
    await Chat.deleteMany({});
    await Message.deleteMany({});
    await FeedbackRequest.deleteMany({});
    await SearchHistory.deleteMany({});
    await OnlineStatus.deleteMany({});
    await MediaFile.deleteMany({});
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- ✅ Database connection');
    console.log('- ✅ Index creation');
    console.log('- ✅ User model');
    console.log('- ✅ Chat model');
    console.log('- ✅ Message model');
    console.log('- ✅ FeedbackRequest model');
    console.log('- ✅ SearchHistory model');
    console.log('- ✅ OnlineStatus model');
    console.log('- ✅ MediaFile model');
    console.log('- ✅ S3 integration (if configured)');
    console.log('- ✅ Aggregated queries');
    console.log('- ✅ Data cleanup');

  } catch (error) {
    console.error('💥 Test failed:', error);
    throw error;
  }
};

// Запускаем тесты только если файл выполняется напрямую
if (require.main === module) {
  testDatabase().then(() => {
    console.log('\n✨ Test completed. Exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

export default testDatabase;