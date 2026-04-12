import {
  buildRasterStyle,
  getTileAttribution,
  getTileAttributionUrl,
  resolveTileServerKey,
} from '../../constants/map-config';

describe('map-config', () => {
  it('uses GSI tiles for coordinates inside Japan', () => {
    expect(resolveTileServerKey([139.7671, 35.6812])).toBe('GSI');
  });

  it('uses OSM tiles for coordinates outside Japan', () => {
    expect(resolveTileServerKey([-122.4194, 37.7749])).toBe('OSM');
  });

  it('enables nearest-neighbor raster resampling for sharper tiles', () => {
    const style = buildRasterStyle('GSI');

    expect(style.layers[0].paint).toEqual({
      'raster-resampling': 'nearest',
    });
  });

  it('returns the correct attribution for each tile source', () => {
    expect(getTileAttribution('OSM')).toBe('© OpenStreetMap Contributors');
    expect(getTileAttribution('GSI')).toBe('© 国土地理院');
  });

  it('returns the correct attribution URL for each tile source', () => {
    expect(getTileAttributionUrl('OSM')).toBe('https://www.openstreetmap.org/copyright');
    expect(getTileAttributionUrl('GSI')).toBe('https://maps.gsi.go.jp/development/ichiran.html');
  });
});