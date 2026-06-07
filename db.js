/**
 * db.js - Supabase Database & Authentication Utility for ArmoryVault Pro
 * Replaces local IndexedDB with Supabase cloud database, RBAC, and TOTP MFA.
 */

(function() {
  let supabaseClient = null;

  /**
   * Initializes the Supabase database connection.
   */
  function initDB() {
    return new Promise((resolve, reject) => {
      if (supabaseClient) {
        resolve(supabaseClient);
        return;
      }

      const config = window.SUPABASE_CONFIG;
      if (!config || config.url === "YOUR_SUPABASE_PROJECT_URL" || config.anonKey === "YOUR_SUPABASE_ANON_KEY") {
        console.warn('Supabase is not configured yet. Credentials missing.');
        reject(new Error("Supabase credentials are not configured. Please edit config.js."));
        return;
      }

      try {
        // Instantiate Supabase client using CDN library
        supabaseClient = window.supabase.createClient(config.url, config.anonKey);
        window.supabaseClientInstance = supabaseClient;
        console.log('Supabase client initialized successfully');
        resolve(supabaseClient);
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        reject(err);
      }
    });
  }

  // --- MAPPING HELPERS ---
  function mapToDb(firearm) {
    return {
      owner: firearm.owner,
      type: firearm.type,
      manufacturer: firearm.manufacturer,
      model: firearm.model,
      caliber: firearm.caliber,
      serial_number: firearm.serialNumber,
      action_type: firearm.actionType,
      sight_type: firearm.sightType,
      value: firearm.value,
      condition: firearm.condition,
      location: firearm.location,
      date_acquired: firearm.dateAcquired,
      image: firearm.image,
      notes: firearm.notes
    };
  }

  function mapFromDb(dbItem) {
    return {
      id: dbItem.id,
      owner: dbItem.owner,
      type: dbItem.type,
      manufacturer: dbItem.manufacturer,
      model: dbItem.model,
      caliber: dbItem.caliber,
      serialNumber: dbItem.serial_number,
      actionType: dbItem.action_type,
      sightType: dbItem.sight_type,
      value: parseFloat(dbItem.value) || 0,
      condition: dbItem.condition,
      location: dbItem.location,
      dateAcquired: dbItem.date_acquired,
      image: dbItem.image,
      notes: dbItem.notes
    };
  }

  // --- DATABASE OPERATIONS ---

  async function getAllFirearms() {
    await initDB();
    const { data, error } = await supabaseClient
      .from('firearms')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapFromDb);
  }

  async function addFirearm(firearm) {
    await initDB();
    const dbItem = mapToDb(firearm);
    
    // Attach current authenticated user UUID
    const sessionRes = await supabaseClient.auth.getSession();
    const userId = sessionRes.data?.session?.user?.id;
    if (userId) dbItem.created_by = userId;

    const { data, error } = await supabaseClient
      .from('firearms')
      .insert([dbItem])
      .select();

    if (error) throw error;
    return data[0].id;
  }

  async function updateFirearm(firearm) {
    await initDB();
    const dbItem = mapToDb(firearm);

    const { error } = await supabaseClient
      .from('firearms')
      .update(dbItem)
      .eq('id', firearm.id);

    if (error) throw error;
  }

  async function deleteFirearm(id) {
    await initDB();
    const { error } = await supabaseClient
      .from('firearms')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async function importFirearms(firearms) {
    await initDB();
    // Wipe all first
    const { error: deleteError } = await supabaseClient
      .from('firearms')
      .delete()
      .neq('id', 0);

    if (deleteError) throw deleteError;

    if (firearms.length === 0) return;

    // Map and insert
    const dbItems = firearms.map(mapToDb);
    const sessionRes = await supabaseClient.auth.getSession();
    const userId = sessionRes.data?.session?.user?.id;
    
    if (userId) {
      dbItems.forEach(item => {
        item.created_by = userId;
      });
    }

    const { error: insertError } = await supabaseClient
      .from('firearms')
      .insert(dbItems);

    if (insertError) throw insertError;
  }

  async function clearAllFirearms() {
    await initDB();
    const { error } = await supabaseClient
      .from('firearms')
      .delete()
      .neq('id', 0);

    if (error) throw error;
  }

  // --- AUTHENTICATION OPERATIONS ---

  async function login(email, password) {
    await initDB();
    return await supabaseClient.auth.signInWithPassword({ email, password });
  }

  async function logout() {
    await initDB();
    return await supabaseClient.auth.signOut();
  }

  async function getSession() {
    await initDB();
    return await supabaseClient.auth.getSession();
  }

  async function getUserProfile(userId) {
    await initDB();
    return await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
  }

  async function getAllUserProfiles() {
    await initDB();
    return await supabaseClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async function adminCreateUser(email, password, role) {
    await initDB();
    // Call the security definer Postgres function
    const { data, error } = await supabaseClient.rpc('admin_create_user', {
      user_email: email,
      user_password: password,
      user_role: role
    });

    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.error || "Failed to create user account.");
    }
    return data;
  }

  // --- MULTI-FACTOR AUTHENTICATION (MFA) ON SUPABASE ---

  async function enrollMFA() {
    await initDB();
    return await supabaseClient.auth.mfa.enroll({ factorType: 'totp' });
  }

  async function challengeAndVerifyMFA(factorId, code) {
    await initDB();
    // Start challenge
    const challengeRes = await supabaseClient.auth.mfa.challenge({ factorId });
    if (challengeRes.error) throw challengeRes.error;

    // Verify code against challenge ID
    return await supabaseClient.auth.mfa.verify({
      factorId: factorId,
      challengeId: challengeRes.data.id,
      code: code
    });
  }

  async function listMFAFactors() {
    await initDB();
    return await supabaseClient.auth.mfa.listFactors();
  }

  // Export to global namespace
  window.ArmoryDB = {
    initDB,
    addFirearm,
    updateFirearm,
    deleteFirearm,
    getAllFirearms,
    importFirearms,
    clearAllFirearms,
    login,
    logout,
    getSession,
    getUserProfile,
    getAllUserProfiles,
    adminCreateUser,
    enrollMFA,
    challengeAndVerifyMFA,
    listMFAFactors
  };
})();
