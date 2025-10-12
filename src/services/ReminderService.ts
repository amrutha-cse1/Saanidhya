import { MurfService } from './MurfService';
import ApiService from './ApiService';

interface Medicine {
  id: string;
  name: string;
  time: string;
  days: string[];
  is_active: boolean;
}

class ReminderService {
  private interval: number | null = null;
  private isRunning = false;
  private currentLanguage = 'en';

  start(language: string = 'en') {
    if (this.isRunning) {
      console.log('[ReminderService] Already running');
      return;
    }

    this.currentLanguage = language;
    this.isRunning = true;
    
    console.log('[ReminderService] Starting global medicine reminder service');
    
    const checkReminders = async () => {
      try {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // Format: HH:MM
        const currentSeconds = now.getSeconds();
        const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
        
        // Only check in the first 15 seconds of each minute to avoid duplicate triggers
        if (currentSeconds > 15) {
          return;
        }
        
        console.log(`[ReminderService] Checking time: ${currentTime}:${currentSeconds.toString().padStart(2, '0')} on ${currentDay}`);
        
        // Check medicine reminders
        const medicineResponse = await ApiService.getMedicines();
        const medicines: Medicine[] = medicineResponse.medicines || [];
        
        for (const medicine of medicines) {
          if (medicine.is_active && 
              medicine.time === currentTime && 
              (medicine.days.length === 0 || medicine.days.includes(currentDay))) {
            
            console.log(`[ReminderService] 🔔 TRIGGERING medicine reminder for ${medicine.name} at ${medicine.time}`);
            
            const message = `Medicine reminder! It's ${medicine.time}. Time to take your ${medicine.name} medicine.`;
            
            try {
              await MurfService.playText(message, this.currentLanguage);
              console.log(`[ReminderService] ✅ Successfully played medicine reminder for ${medicine.name}`);
            } catch (error) {
              console.error(`[ReminderService] ❌ Failed to play medicine reminder for ${medicine.name}:`, error);
            }
          }
        }

        // Check memory aid reminders
        const memoryResponse = await ApiService.getMemoryAids();
        const memoryAids: any[] = memoryResponse.memoryAids || [];
        
        for (const memory of memoryAids) {
          if (memory.is_active && 
              memory.time === currentTime) {
            
            console.log(`[ReminderService] 🔔 TRIGGERING memory reminder for ${memory.title} at ${memory.time}`);
            
            let message = `Memory reminder! ${memory.title}`;
            if (memory.notes) {
              message += `. ${memory.notes}`;
            }
            if (memory.type === 'birthday') {
              message += '. Don\'t forget to call and wish them!';
            } else if (memory.type === 'anniversary') {
              message += '. This is an important anniversary!';
            }
            
            try {
              await MurfService.playText(message, this.currentLanguage);
              console.log(`[ReminderService] ✅ Successfully played memory reminder for ${memory.title}`);
            } catch (error) {
              console.error(`[ReminderService] ❌ Failed to play memory reminder for ${memory.title}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('[ReminderService] Error checking reminders:', error);
      }
    };

    // Check every 10 seconds
    this.interval = setInterval(checkReminders, 10000);
    
    // Check immediately
    checkReminders();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[ReminderService] Stopped global reminder service');
  }

  updateLanguage(language: string) {
    this.currentLanguage = language;
    console.log(`[ReminderService] Updated language to: ${language}`);
  }

  isServiceRunning() {
    return this.isRunning;
  }
}

// Export a singleton instance
export const reminderService = new ReminderService();
export default reminderService;
