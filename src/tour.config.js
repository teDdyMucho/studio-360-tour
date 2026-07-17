/**
 * ============================================================================
 *  TOUR CONFIGURATION  —  ito lang ang i-e-edit mo para baguhin ang tour
 * ============================================================================
 *
 *  Bawat "scene" = isang 360° scan point (isang panorama photo).
 *
 *  Fields kada scene:
 *    id        : natatanging pangalan (walang space)
 *    name      : ipapakitang pangalan sa screen
 *    panorama  : path ng 360° equirectangular image (nasa /public/images/)
 *    initialYaw: saang direksyon nakaharap pagbukas (degrees, 0-360)
 *    map       : posisyon sa floorplan { x, y } bilang PERCENT (0-100)
 *    hotspots  : mga BILOG sa sahig (floor rings) papunta sa ibang kwarto —
 *                parang nakalatag sa lapag, pinipindot para "maglakad" papasok
 *        - target : id ng scene na pupuntahan
 *        - yaw    : direksyon ng bilog (degrees). 0=harap, 90=kanan, 180=likod, 270=kaliwa
 *        - dist   : (optional) gaano kalayo sa unahan sa sahig. Default 3.3.
 *                   Mas malaki = mas malayo/mataas sa frame. 2.5=malapit, 4.5=malayo.
 *        - arriveYaw : (optional) anong direksyon ang haharapin PAGDATING sa target
 *                   na kwarto (para tuloy-tuloy ang lakad, nakatingin papasok).
 *                   Kung wala, gagamitin ang `yaw`.
 *        - label  : (optional) text na lalabas kapag hover
 *
 *  TIP: Pindutin ang "P" habang nasa loob para makita ang kasalukuyang yaw —
 *       i-drag ang view papunta sa pinto, tingnan ang yaw, kopyahin dito.
 * ============================================================================
 */

export const tourInfo = {
  title: 'Studio Apartment',
  subtitle: '360° Virtual Walkthrough',
}

/**
 * `north` aligns every panorama to one shared world heading so that your viewing
 * direction stays continuous as you walk between rooms (like Matterport's aligned
 * scans). It is the LOCAL yaw in each panorama that faces the shared reference
 * (here: the window wall). global_heading = localYaw - north.
 */
export const scenes = [
  {
    id: 'living',
    name: 'Living & Dining',
    panorama: './images/pano-living.jpg',
    initialYaw: 180,
    north: 90,
    map: { x: 60, y: 54 },
    hotspots: [
      // bed at f~0.48; kitchen far-left f~0.10 — already point opposite ways
      { target: 'bedroom', yaw: 96,  dist: 4.0, arriveYaw: 95,  label: 'Bedroom' },
      { target: 'kitchen', yaw: 232, dist: 3.8, arriveYaw: 165, label: 'Kitchen' },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    panorama: './images/pano-bedroom.jpg',
    initialYaw: 240,
    north: 18,
    map: { x: 22, y: 47 },
    hotspots: [
      // both go through the same doorway -> separate them: dining (near) vs kitchen (far)
      { target: 'living',  yaw: 176, dist: 4.3, arriveYaw: 130, label: 'Living & Dining' },
      { target: 'kitchen', yaw: 153, dist: 5.4, arriveYaw: 165, label: 'Kitchen' },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    panorama: './images/pano-kitchen.jpg',
    initialYaw: 170,
    north: 80,
    map: { x: 82, y: 63 },
    hotspots: [
      // both through the same opening (f~0.53) -> living near, bedroom far
      { target: 'living',  yaw: 84, dist: 3.8, arriveYaw: 130, label: 'Living & Dining' },
      { target: 'bedroom', yaw: 72, dist: 5.2, arriveYaw: 95,  label: 'Bedroom' },
    ],
  },
]

export const floorplan = {
  image: './images/floorplan.jpg',
}

// unang scene na bubukas
export const startSceneId = 'living'

export const sceneById = (id) => scenes.find((s) => s.id === id)
