import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from 'src/services/supabase'
import { db } from 'src/services/localDB'
import { useOnlineStore } from './online'

export const useActivitiesStore = defineStore('activities', () => {
  const activities = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchActivities () {
    loading.value = true
    error.value = null
    try {
      const online = useOnlineStore()
      if (online.isOnline) {
        const { data, error: err } = await supabase
          .from('activities')
          .select('*')
          .order('nome')
        if (err) throw err
        activities.value = data || []
        for (const act of activities.value) {
          await db.activities.put(act)
        }
      } else {
        activities.value = await db.activities.toArray()
      }
    } catch (e) {
      error.value = e.message
      activities.value = await db.activities.toArray()
    } finally {
      loading.value = false
    }
  }

  async function createActivity (payload) {
    const { data, error: err } = await supabase
      .from('activities')
      .insert(payload)
      .select()
      .single()
    if (err) throw err
    activities.value.push(data)
    await db.activities.put(data)
    return data
  }

  async function updateActivity (id, payload) {
    const { data, error: err } = await supabase
      .from('activities')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = activities.value.findIndex(a => a.id === id)
    if (idx !== -1) activities.value[idx] = data
    await db.activities.put(data)
    return data
  }

  async function deleteActivity (id) {
    const { error: err } = await supabase.from('activities').delete().eq('id', id)
    if (err) throw err
    activities.value = activities.value.filter(a => a.id !== id)
    await db.activities.delete(id)
  }

  return {
    activities,
    loading,
    error,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity
  }
})
