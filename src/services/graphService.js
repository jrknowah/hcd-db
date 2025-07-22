import { graphRequest } from '../config/authConfig';

class GraphService {
  constructor(msalInstance) {
    this.msalInstance = msalInstance;
  }

  async getAccessToken() {
    const account = this.msalInstance.getActiveAccount();
    if (!account) return null;

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        ...graphRequest,
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      // If silent request fails, try interactive
      const response = await this.msalInstance.acquireTokenPopup(graphRequest);
      return response.accessToken;
    }
  }

  async getUserGroups(userId = 'me') {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) return [];

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/${userId}/memberOf`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      // Filter to only security groups and return their IDs
      return data.value
        .filter(item => item['@odata.type'] === '#microsoft.graph.group')
        .map(group => ({
          id: group.id,
          displayName: group.displayName,
          description: group.description
        }));
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  async getUserPhoto(userId = 'me', size = '96x96') {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) return null;

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/${userId}/photos/${size}/$value`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) return null;

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching user photo:', error);
      return null;
    }
  }
}

export default GraphService;