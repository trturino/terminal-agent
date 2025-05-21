export interface JsonSerializable<T> {
  toJSON(): T;
}

export interface Timestamped {
  created_at?: Date;
  updated_at?: Date;
  last_seen_at?: Date;
}
