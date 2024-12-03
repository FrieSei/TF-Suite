The file /repo/TF-Suite/lib/google/calendar-service.ts has been edited. Here's the result of running `cat -n` on a snippet of /repo/TF-Suite/lib/google/calendar-service.ts:
   123	    const busyPeriods = response.data.calendars?.[calendarId.calendar_id]?.busy || [];
   124	    return busyPeriods.length === 0;
   125	  }
   126	
   127	  async createEvent(
   128	    accessToken: string,
   129	    calendarId: string,
   130	    event: {
   131	      summary: string;
   132	      description?: string;
   133	      location?: string;
   134	      start: { dateTime: string; timeZone?: string };
   135	      end: { dateTime: string; timeZone?: string };
   136	      attendees?: Array<{ email: string }>;
   137	    }
   138	  ): Promise<string> {
   139	    try {
   140	      this.oauth2Client.setCredentials({ access_token: accessToken });
   141	      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
   142	
   143	      const response = await calendar.events.insert({
   144	        calendarId: calendarId,
   145	        requestBody: {
   146	          ...event,
   147	          reminders: {
   148	            useDefault: true
   149	          }
   150	        }
   151	      });
   152	
   153	      if (!response.data.id) {
   154	        throw new Error('Failed to create calendar event');
   155	      }
   156	
   157	      return response.data.id;
   158	    } catch (error) {
   159	      console.error('Error creating calendar event:', error);
   160	      throw error;
   161	    }
   162	  }
   163	
   164	  async updateEvent(
   165	    accessToken: string,
   166	    calendarId: string,
   167	    eventId: string,
   168	    event: {
   169	      summary?: string;
   170	      description?: string;
   171	      location?: string;
   172	      start?: { dateTime: string; timeZone?: string };
   173	      end?: { dateTime: string; timeZone?: string };
   174	      attendees?: Array<{ email: string }>;
   175	    }
   176	  ): Promise<void> {
   177	    try {
   178	      this.oauth2Client.setCredentials({ access_token: accessToken });
   179	      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
   180	
   181	      await calendar.events.update({
   182	        calendarId: calendarId,
   183	        eventId: eventId,
   184	        requestBody: event
   185	      });
   186	    } catch (error) {
   187	      console.error('Error updating calendar event:', error);
   188	      throw error;
   189	    }
   190	  }
   191	
   192	  async deleteEvent(
   193	    accessToken: string,
   194	    calendarId: string,
   195	    eventId: string
   196	  ): Promise<void> {
   197	    try {
   198	      this.oauth2Client.setCredentials({ access_token: accessToken });
   199	      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
   200	
   201	      await calendar.events.delete({
   202	        calendarId: calendarId,
   203	        eventId: eventId,
   204	      });
   205	    } catch (error) {
   206	      console.error('Error deleting calendar event:', error);
   207	      throw error;
   208	    }
   209	  }
   210	
   211	  async getEvent(
   212	    accessToken: string,
   213	    calendarId: string,
   214	    eventId: string
   215	  ) {
   216	    try {
   217	      this.oauth2Client.setCredentials({ access_token: accessToken });
   218	      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
   219	
   220	      const response = await calendar.events.get({
   221	        calendarId: calendarId,
   222	        eventId: eventId,
   223	      });
   224	
   225	      return response.data;
   226	    } catch (error) {
   227	      console.error('Error getting calendar event:', error);
   228	      throw error;
   229	    }
   230	  }
   231	}
Review the changes and make sure they are as expected. Edit the file again if necessary.
