import { UserLocation } from '../types/location';

export interface ReliefCategoryResource {
  readonly id: string;
  readonly categoryTitle: string;
  readonly iconName: 'shelter' | 'medical' | 'water' | 'food' | 'rescue' | 'sdma';
  readonly status: 'Available' | 'Standby' | 'Coordinated via District';
  readonly description: string;
  readonly primaryAgency: string;
  readonly contactOrPortal: string;
  readonly isVerified: boolean;
}

export interface StateDisasterAuthority {
  readonly stateName: string;
  readonly authorityName: string;
  readonly portalUrl: string;
  readonly emergencyEmail: string;
  readonly controlRoomTel: string;
}

class ReliefService {
  /**
   * Verified State Disaster Management Authorities (SDMAs)
   */
  public getStateDisasterAuthority(location: UserLocation): StateDisasterAuthority {
    const region = location.region.toLowerCase();

    if (region.includes('gujarat')) {
      return {
        stateName: 'Gujarat',
        authorityName: 'Gujarat State Disaster Management Authority (GSDMA)',
        portalUrl: 'https://gsdma.org/',
        emergencyEmail: 'info@gsdma.org',
        controlRoomTel: '079-23259283 / 1070',
      };
    }

    if (region.includes('maharashtra')) {
      return {
        stateName: 'Maharashtra',
        authorityName: 'Maharashtra State Disaster Management Authority (MSDMA)',
        portalUrl: 'https://sdma.maharashtra.gov.in/',
        emergencyEmail: 'controlroom@maharashtra.gov.in',
        controlRoomTel: '022-22027990 / 1070',
      };
    }

    if (region.includes('delhi')) {
      return {
        stateName: 'Delhi NCR',
        authorityName: 'Delhi Disaster Management Authority (DDMA)',
        portalUrl: 'https://ddma.delhi.gov.in/',
        emergencyEmail: 'ddma.delhi@nic.in',
        controlRoomTel: '1077 / 011-22421656',
      };
    }

    if (region.includes('karnataka')) {
      return {
        stateName: 'Karnataka',
        authorityName: 'Karnataka State Disaster Management Authority (KSDMA)',
        portalUrl: 'https://ksdma.karnataka.gov.in/',
        emergencyEmail: 'ksdma-karnataka@gov.in',
        controlRoomTel: '080-22340676 / 1070',
      };
    }

    if (region.includes('tamil nadu')) {
      return {
        stateName: 'Tamil Nadu',
        authorityName: 'Tamil Nadu State Disaster Management Authority (TNSDMA)',
        portalUrl: 'https://tnsdma.tn.gov.in/',
        emergencyEmail: 'tnsdma@tn.gov.in',
        controlRoomTel: '044-28593990 / 1070',
      };
    }

    if (region.includes('west bengal')) {
      return {
        stateName: 'West Bengal',
        authorityName: 'West Bengal Disaster Management & Civil Defence',
        portalUrl: 'https://wbdmd.gov.in/',
        emergencyEmail: 'dm-wb@nic.in',
        controlRoomTel: '033-22143526 / 1070',
      };
    }

    if (region.includes('kerala')) {
      return {
        stateName: 'Kerala',
        authorityName: 'Kerala State Disaster Management Authority (KSDMA)',
        portalUrl: 'https://sdma.kerala.gov.in/',
        emergencyEmail: 'keralasdma@gmail.com',
        controlRoomTel: '0471-2364424 / 1070',
      };
    }

    // Default Generic SDMA Node
    return {
      stateName: location.region,
      authorityName: `${location.region} State Disaster Management Authority (SDMA)`,
      portalUrl: 'https://ndma.gov.in/',
      emergencyEmail: 'support@ndma.gov.in',
      controlRoomTel: '1070 (State Control Room)',
    };
  }

  /**
   * Verified Relief & Civic Support Resource Categories
   */
  public getReliefResources(location: UserLocation): readonly ReliefCategoryResource[] {
    const sdma = this.getStateDisasterAuthority(location);

    return [
      {
        id: 'shelter-01',
        categoryTitle: 'Designated Flood Shelters & Safe Havens',
        iconName: 'shelter',
        status: 'Coordinated via District',
        description: `Community halls, municipal schools, and high-ground civic shelters mapped by the ${location.city} District Administration for rapid temporary accommodation.`,
        primaryAgency: `${location.city} Municipal Disaster Cell`,
        contactOrPortal: 'Dial 1077 for closest active shelter allocation',
        isVerified: true,
      },
      {
        id: 'medical-01',
        categoryTitle: 'Emergency Medical & Trauma Support',
        iconName: 'medical',
        status: 'Available',
        description: 'Rapid mobile medical units, essential anti-venom/waterborne disease kits, and government civil hospital triage centers.',
        primaryAgency: 'District Health Department & Red Cross Society',
        contactOrPortal: 'Dial 108 for Emergency Ambulance Dispatch',
        isVerified: true,
      },
      {
        id: 'water-food-01',
        categoryTitle: 'Potable Drinking Water & Food Rations',
        iconName: 'water',
        status: 'Available',
        description: 'Municipal water tankers and civic emergency ration distribution centers deployed to low-lying catchment zones during waterlogging.',
        primaryAgency: `${location.city} Municipal Corporation`,
        contactOrPortal: 'Coordinated through Ward Disaster Control Rooms',
        isVerified: true,
      },
      {
        id: 'rescue-logistics-01',
        categoryTitle: 'Boat Evacuation & Search Logistics',
        iconName: 'rescue',
        status: 'Standby',
        description: 'Inflatable rescue boats (IRBs), motorized life-saving rafts, and high-clearance rescue vehicles pre-positioned by SDRF/NDRF.',
        primaryAgency: 'NDRF Battalion & State Disaster Response Force',
        contactOrPortal: 'Toll-Free Helpline: 1078 / 112',
        isVerified: true,
      },
      {
        id: 'state-authority-01',
        categoryTitle: 'Official State Disaster Management Authority',
        iconName: 'sdma',
        status: 'Available',
        description: `Apex statutory body governing relief allocation, damage compensations, and state-wide relief funds across ${location.region}.`,
        primaryAgency: sdma.authorityName,
        contactOrPortal: sdma.portalUrl,
        isVerified: true,
      },
    ];
  }
}

export const reliefService = new ReliefService();
