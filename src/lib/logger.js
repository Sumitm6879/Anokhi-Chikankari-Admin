import { supabase } from './supabase';

export const logAction = async (actionType, resource, description, metaData = {}) => {
  try {
    const { error } = await supabase.rpc('log_admin_action', {
      action_type: actionType,
      resource: resource,
      description: description,
      meta_data: metaData
    });
    if (error) console.error("Logging failed:", error);
  } catch (err) {
    console.error("Logging error:", err);
  }
};