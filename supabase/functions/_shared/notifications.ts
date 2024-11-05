import { corsHeaders } from './cors'
import { getEmailContent, getSMSContent } from './templates'

export async function processNotifications(supabase: any) {
  const now = new Date()
  const endTime = new Date(now.getTime() + 60 * 60 * 1000)

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select(`
      *,
      appointment:appointments(
        *,
        patient:patients(*),
        surgeon:doctors(*),
        event_type:event_types(*)
      )
    `)
    .eq('status', 'pending')
    .gte('scheduled_for', now.toISOString())
    .lte('scheduled_for', endTime.toISOString())

  if (error) throw error

  return Promise.allSettled(
    notifications?.map(async (notification: any) => {
      try {
        if (notification.channel === 'email') {
          await sendEmail(notification)
        } else if (notification.channel === 'sms') {
          await sendSMS(notification)
        }

        await supabase
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        return { success: true, id: notification.id }
      } catch (error: any) {
        await supabase
          .from('notifications')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', notification.id)

        return { success: false, id: notification.id, error: error.message }
      }
    }) || []
  )
}