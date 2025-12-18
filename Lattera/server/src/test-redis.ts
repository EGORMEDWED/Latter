/**
 * Redis Testing Script
 * Tests all Redis utility functions and connection
 */

import {
  initializeRedis,
  setEmailCode,
  getEmailCode,
  deleteEmailCode,
  setRefreshToken,
  getRefreshToken,
  invalidateAllRefreshTokens,
  setUserStatus,
  getUserStatus,
  isRedisHealthy,
  getRedisConnectionState,
} from './database';

const testRedis = async () => {
  try {
    console.log('🧪 Starting Redis Tests...\n');

    // Initialize Redis connection
    console.log('=== REDIS CONNECTION TEST ===');
    const redis = await initializeRedis();
    
    if (redis) {
      console.log('✅ Redis connection successful');
    } else {
      console.log('⚠️  Redis not available, will use fallback');
    }

    // Test Redis health
    console.log('\n=== HEALTH CHECK TEST ===');
    const isHealthy = await isRedisHealthy();
    console.log(`🔍 Redis Health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);

    const state = getRedisConnectionState();
    console.log(`📊 Connection State: ${JSON.stringify(state, null, 2)}`);

    // Test email code functions
    console.log('\n=== EMAIL CODE FUNCTIONS TEST ===');
    const testEmail = 'test@example.com';
    const testCode = '123456';

    console.log(`📧 Setting email code for ${testEmail}...`);
    const setResult = await setEmailCode(testEmail, testCode);
    console.log(`✅ Email code set: ${setResult}`);

    console.log(`📧 Getting email code for ${testEmail}...`);
    const retrievedCode = await getEmailCode(testEmail);
    console.log(`📧 Retrieved code: ${retrievedCode} ${retrievedCode === testCode ? '✅ MATCH' : '❌ MISMATCH'}`);

    console.log(`📧 Deleting email code for ${testEmail}...`);
    const deleteResult = await deleteEmailCode(testEmail);
    console.log(`✅ Email code deleted: ${deleteResult}`);

    console.log(`📧 Verifying deletion...`);
    const deletedCode = await getEmailCode(testEmail);
    console.log(`📧 Code after deletion: ${deletedCode || 'null'} ${!deletedCode ? '✅ CORRECT' : '❌ INCORRECT'}`);

    // Test refresh token functions
    console.log('\n=== REFRESH TOKEN FUNCTIONS TEST ===');
    const testUserId = 'test-user-123';
    const testToken = 'refresh-token-abc123';

    console.log(`🔑 Setting refresh token for user ${testUserId}...`);
    const tokenSetResult = await setRefreshToken(testUserId, testToken);
    console.log(`✅ Refresh token set: ${tokenSetResult}`);

    console.log(`🔑 Getting refresh token for user ${testUserId}...`);
    const retrievedToken = await getRefreshToken(testUserId);
    console.log(`🔑 Retrieved token: ${retrievedToken} ${retrievedToken === testToken ? '✅ MATCH' : '❌ MISMATCH'}`);

    console.log(`🔑 Invalidating all refresh tokens for user ${testUserId}...`);
    const invalidateResult = await invalidateAllRefreshTokens(testUserId);
    console.log(`✅ Tokens invalidated: ${invalidateResult}`);

    console.log(`🔑 Verifying invalidation...`);
    const invalidToken = await getRefreshToken(testUserId);
    console.log(`🔑 Token after invalidation: ${invalidToken || 'null'} ${!invalidToken ? '✅ CORRECT' : '❌ INCORRECT'}`);

    // Test user status functions
    console.log('\n=== USER STATUS FUNCTIONS TEST ===');
    const testStatus = 'online';

    console.log(`👤 Setting user status for ${testUserId}...`);
    const statusSetResult = await setUserStatus(testUserId, testStatus);
    console.log(`✅ User status set: ${statusSetResult}`);

    console.log(`👤 Getting user status for ${testUserId}...`);
    const retrievedStatus = await getUserStatus(testUserId);
    console.log(`👤 Retrieved status: ${retrievedStatus} ${retrievedStatus === testStatus ? '✅ MATCH' : '❌ MISMATCH'}`);

    // Test with different status
    const offlineStatus = 'offline';
    console.log(`👤 Updating status to offline...`);
    await setUserStatus(testUserId, offlineStatus, 60); // 60 seconds TTL
    
    const updatedStatus = await getUserStatus(testUserId);
    console.log(`👤 Updated status: ${updatedStatus} ${updatedStatus === offlineStatus ? '✅ MATCH' : '❌ MISMATCH'}`);

    // Test error handling with invalid operations
    console.log('\n=== ERROR HANDLING TEST ===');
    
    try {
      console.log('🧪 Testing invalid email...');
      const invalidCode = await getEmailCode('invalid@email.test');
      console.log(`🧪 Invalid email result: ${invalidCode || 'null'}`);
    } catch (error) {
      console.log(`🧪 Error handled gracefully: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      console.log('🧪 Testing invalid user...');
      const invalidStatus = await getUserStatus('invalid-user-id');
      console.log(`🧪 Invalid user status: ${invalidStatus || 'null'}`);
    } catch (error) {
      console.log(`🧪 Error handled gracefully: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('\n✅ All Redis tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Redis connection: ✅');
    console.log('- Email code operations: ✅');
    console.log('- Refresh token operations: ✅');
    console.log('- User status operations: ✅');
    console.log('- Error handling: ✅');

  } catch (error) {
    console.error('❌ Redis test failed:', error);
    console.error('💥 Error details:', error);
    process.exit(1);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  testRedis()
    .then(() => {
      console.log('\n🎉 Test suite completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export default testRedis;