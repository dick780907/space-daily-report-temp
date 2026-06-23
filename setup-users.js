/**
 * ============================================
 * 史貝斯商務中心日報系統 - 批量建立使用者腳本
 * ============================================
 * 使用方法：
 *   1. 先完成 Firebase 部署
 *   2. 前往 Firebase Console > 專案設定 > 服務帳戶
 *   3. 產生新的私鑰，下載 JSON 檔案
 *   4. 設定環境變數：export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 *   5. 執行：node setup-users.js
 * ============================================
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// ============================================
// 使用者資料設定
// ============================================
const USERS = [
  {
    email: 'master@space.com',
    password: 'Master@2024',
    displayName: '總管理者',
    role: 'master',
    branchCode: null,
    name: '總管理者'
  },
  {
    email: 'tc_ck@space.com',
    password: 'TC_CK123',
    displayName: '台中-中港館',
    role: 'branch',
    branchCode: 'TC_CK',
    name: '台中-中港館'
  },
  {
    email: 'tc_yt@space.com',
    password: 'TC_YT123',
    displayName: '台中-英才館',
    role: 'branch',
    branchCode: 'TC_YT',
    name: '台中-英才館'
  },
  {
    email: 'tc_cc@space.com',
    password: 'TC_CC123',
    displayName: '台中-中清館',
    role: 'branch',
    branchCode: 'TC_CC',
    name: '台中-中清館'
  },
  {
    email: 'tc_cf1@space.com',
    password: 'TC_CF1123',
    displayName: '台中-七期1館',
    role: 'branch',
    branchCode: 'TC_CF1',
    name: '台中-七期1館'
  },
  {
    email: 'tc_cf2@space.com',
    password: 'TC_CF2123',
    displayName: '台中-七期2館',
    role: 'branch',
    branchCode: 'TC_CF2',
    name: '台中-七期2館'
  },
  {
    email: 'tp_zx@space.com',
    password: 'TP_ZX123',
    displayName: '台北-忠孝館',
    role: 'branch',
    branchCode: 'TP_ZX',
    name: '台北-忠孝館'
  },
  {
    email: 'tp_xz1@space.com',
    password: 'TP_XZ1123',
    displayName: '新北-汐止1館',
    role: 'branch',
    branchCode: 'TP_XZ1',
    name: '新北-汐止1館'
  },
  {
    email: 'tp_xz2@space.com',
    password: 'TP_XZ2123',
    displayName: '新北-汐止2館',
    role: 'branch',
    branchCode: 'TP_XZ2',
    name: '新北-汐止2館'
  }
];

// ============================================
// 館別資料
// ============================================
const BRANCHES = [
  { code: 'TC_CK', name: '台中-中港館', city: '台中' },
  { code: 'TC_YT', name: '台中-英才館', city: '台中' },
  { code: 'TC_CC', name: '台中-中清館', city: '台中' },
  { code: 'TC_CF1', name: '台中-七期1館', city: '台中' },
  { code: 'TC_CF2', name: '台中-七期2館', city: '台中' },
  { code: 'TP_ZX', name: '台北-忠孝館', city: '台北' },
  { code: 'TP_XZ1', name: '新北-汐止1館', city: '新北' },
  { code: 'TP_XZ2', name: '新北-汐止2館', city: '新北' }
];

// ============================================
// 主程式
// ============================================
async function main() {
  console.log('\n========================================');
  console.log('  史貝斯商務中心日報系統');
  console.log('  批量建立使用者腳本');
  console.log('========================================\n');

  // 檢查環境變數
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ 錯誤：未設定 GOOGLE_APPLICATION_CREDENTIALS 環境變數');
    console.error('');
    console.error('請先設定環境變數：');
    console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"');
    console.error('');
    console.error('取得服務帳戶金鑰的步驟：');
    console.error('  1. 前往 Firebase Console > 專案設定 > 服務帳戶');
    console.error('  2. 點擊「產生新的私鑰」');
    console.error('  3. 下載 JSON 檔案');
    console.error('  4. 設定上方環境變數');
    process.exit(1);
  }

  try {
    // 初始化 Firebase Admin
    initializeApp();
    console.log('✅ Firebase Admin SDK 初始化成功\n');

    const auth = getAuth();
    const db = getFirestore();

    // ============================================
    // 建立館別資料
    // ============================================
    console.log('📋 步驟 1/3：建立館別資料...');
    const branchesRef = db.collection('branches');

    for (const branch of BRANCHES) {
      const docRef = branchesRef.doc(branch.code);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        console.log(`   ⏭  館別「${branch.name}」已存在，跳過`);
      } else {
        await docRef.set({
          code: branch.code,
          name: branch.name,
          city: branch.city,
          createdAt: new Date()
        });
        console.log(`   ✅ 館別「${branch.name}」建立成功`);
      }
    }
    console.log('');

    // ============================================
    // 建立 Authentication 使用者
    // ============================================
    console.log('👤 步驟 2/3：建立 Authentication 使用者...');
    const createdUsers = [];

    for (const user of USERS) {
      try {
        // 檢查使用者是否已存在
        try {
          const existingUser = await auth.getUserByEmail(user.email);
          console.log(`   ⏭  使用者「${user.email}」已存在，跳過`);
          createdUsers.push({
            ...user,
            uid: existingUser.uid
          });
          continue;
        } catch (err) {
          // 使用者不存在，繼續建立
        }

        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true
        });

        console.log(`   ✅ 使用者「${user.email}」建立成功 (UID: ${userRecord.uid})`);
        createdUsers.push({
          ...user,
          uid: userRecord.uid
        });
      } catch (error) {
        console.error(`   ❌ 使用者「${user.email}」建立失敗：${error.message}`);
      }
    }
    console.log('');

    // ============================================
    // 建立 Firestore users 文件
    // ============================================
    console.log('📝 步驟 3/3：建立 Firestore 使用者文件...');
    const usersRef = db.collection('users');

    for (const user of createdUsers) {
      try {
        const docRef = usersRef.doc(user.uid);
        const docSnap = await docRef.get();

        const userData = {
          email: user.email,
          role: user.role,
          name: user.name,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 館別人員才加入 branchCode
        if (user.branchCode) {
          userData.branchCode = user.branchCode;
        }

        if (docSnap.exists) {
          await docRef.update({
            ...userData,
            createdAt: docSnap.data().createdAt // 保留原始建立時間
          });
          console.log(`   ✅ 文件「${user.email}」已更新`);
        } else {
          await docRef.set(userData);
          console.log(`   ✅ 文件「${user.email}」建立成功`);
        }
      } catch (error) {
        console.error(`   ❌ 文件「${user.email}」建立失敗：${error.message}`);
      }
    }
    console.log('');

    // ============================================
    // 完成
    // ============================================
    console.log('========================================');
    console.log('  ✅ 所有使用者建立完成！');
    console.log('========================================\n');
    console.log('📋 使用者清單：');
    console.log('┌─────────────────────────┬───────────────┬─────────────────┐');
    console.log('│ 帳號                    │ 角色          │ 館別            │');
    console.log('├─────────────────────────┼───────────────┼─────────────────┤');

    for (const user of USERS) {
      const role = user.role === 'master' ? '總管理者' : '館別人員';
      const branch = user.branchCode || '全部';
      console.log(`│ ${user.email.padEnd(23)} │ ${role.padEnd(13)} │ ${branch.padEnd(15)} │`);
    }

    console.log('└─────────────────────────┴───────────────┴─────────────────┘\n');
    console.log('🔑 預設密碼：');
    console.log('   總管理者：Master@2024');
    console.log('   館別人員：[館別代碼]123（例如：TC_CK123）\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 發生錯誤：', error.message);
    console.error('\n請確認：');
    console.error('  1. GOOGLE_APPLICATION_CREDENTIALS 路徑正確');
    console.error('  2. 服務帳戶金鑰有足夠權限');
    console.error('  3. Firebase 專案已啟用 Firestore 和 Authentication');
    process.exit(1);
  }
}

// 執行主程式
main();
