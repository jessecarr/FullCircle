import { supabase } from '../supabase';
import { Customer } from '../supabase';

export const getCustomerByEmail = async (email: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer by email:', error);
    return null;
  }

  return data;
};

export const getCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer by phone:', error);
    return null;
  }

  return data;
};

export const createCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer | null> => {
  try {
    // First try to find existing customer by email or phone
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .or(`email.eq.${customerData.email},phone.eq.${customerData.phone}`)
      .maybeSingle();

    if (existing) {
      // Update existing customer
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...customerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new customer
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Customer upsert error:', {
      error,
      customerData
    });
    return null;
  }
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    return null;
  }

  return data;
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`email.ilike.%${query}%,phone.ilike.%${query}%,name.ilike.%${query}%`);

  if (error) {
    console.error('Error searching customers:', error);
    return [];
  }

  return data;
};
