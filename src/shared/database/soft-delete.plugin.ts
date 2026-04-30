import { Query, Schema } from 'mongoose';

export interface SoftDeleteDocument {
  deletedAt?: Date | null;
  isDeleted: boolean;
}

export function softDeletePlugin(schema: Schema) {
  schema.add({
    deletedAt: { type: Date, default: null },
  });

  schema.virtual('isDeleted').get(function (this: SoftDeleteDocument) {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  });

  const excludeDeleted = function (this: Query<unknown, unknown>) {
    const filter = this.getFilter();
    if (filter.includeDeleted) {
      delete filter.includeDeleted;
      this.setQuery(filter);
      return;
    }
    this.where({ deletedAt: null });
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('findOneAndDelete', excludeDeleted);

  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
  };

  schema.statics.softDeleteById = function (id: string) {
    return this.findOneAndUpdate({ id }, { deletedAt: new Date() }, { new: true }).exec();
  };

  schema.statics.restoreById = function (id: string) {
    return this.findOneAndUpdate(
      { id, includeDeleted: true },
      { deletedAt: null },
      { new: true },
    ).exec();
  };
}
