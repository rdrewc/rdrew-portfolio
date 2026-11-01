// Just enough of a netCDF classic (CDF-1) reader for the moisture grid: the dimensions and variables
// from the header, and a DataView to read the values. Multi-byte numbers are big-endian.
export function readNetCDF(buffer){
  const view = new DataView(buffer), bytes = new Uint8Array(buffer), text = new TextDecoder();
  if(text.decode(bytes.subarray(0, 3)) !== 'CDF' || bytes[3] !== 1) throw new Error('not netCDF classic');
  const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8 };
  let at = 8; // past the magic number and the record count
  const pad = (n) => n + (4 - n % 4) % 4;
  const int = () => { const value = view.getInt32(at); at += 4; return value; };
  const name = () => {
    const length = int(), value = text.decode(bytes.subarray(at, at + length));
    at += pad(length);
    return value;
  };
  const list = (read) => {
    int(); // the list's tag
    return Array.from({ length: int() }, read);
  };
  const attribute = () => {
    const key = name(), type = int(), count = int(), start = at;
    at += pad(count * SIZES[type]);
    return [key, type === 2 ? text.decode(bytes.subarray(start, start + count)) : null];
  };
  const dimensions = list(() => ({ name: name(), length: int() }));
  list(attribute); // global attributes
  const variables = list(() => {
    const variable = { name: name() };
    variable.dimensions = Array.from({ length: int() }, () => dimensions[int()]);
    variable.attributes = Object.fromEntries(list(attribute));
    variable.type = int();
    int(); // size
    variable.begin = int();
    return variable;
  });
  return { view, variables };
}

// A one-dimensional variable's values as numbers (floats or doubles).
export function values(file, variable){
  const size = variable.type === 6 ? 8 : 4;
  return Array.from({ length: variable.dimensions[0].length }, (_, i) => size === 8
    ? file.view.getFloat64(variable.begin + i * 8)
    : file.view.getFloat32(variable.begin + i * 4));
}
