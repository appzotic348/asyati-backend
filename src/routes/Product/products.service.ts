import {
  BadRequestException, ConflictException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { AddVariantDto, UpdateVariantDto } from './dto/variant.dto';
import { uploadToCloudinary, deleteFromCloudinary } from '../../common/cloudinary';
import { paginate, PaginatedResult } from '../../common/pagination';
import { DepartmentService } from '../department/department.service';
import { CategoryService } from '../category/category.service';
import { TaxGuideService } from '../tax-guide/tax-guide.service';
import { BrandService } from '../brand/brand.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly departmentService: DepartmentService,
    private readonly categoryService:   CategoryService,
    private readonly taxGuideService:   TaxGuideService,
    private readonly brandService:      BrandService,
    private readonly inventoryService:  InventoryService,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async validateClassification(deptId: string, catId: string): Promise<void> {
    await this.departmentService.findById(deptId);
    await this.categoryService.validateCategoryBelongsToDepartment(catId, deptId);
  }

  private buildVariantSku(sellerSkuId: string, color: string, size: string): string {
    return `${sellerSkuId}-${color.toUpperCase().replace(/\s+/g, '')}-${size.toUpperCase().replace(/\s+/g, '')}`;
  }

  private computeTotals(variants: any[]): { totalStock: number; totalReserved: number; availableStock: number } {
    const totalStock    = variants.reduce((s, v) => s + (v.inventory?.stock    ?? 0), 0);
    const totalReserved = variants.reduce((s, v) => s + (v.inventory?.reserved ?? 0), 0);
    return { totalStock, totalReserved, availableStock: Math.max(0, totalStock - totalReserved) };
  }

  private normalizeMetadata(
    raw?: Array<{ key: string; value: string; type?: string }>,
  ): Array<{ key: string; value: string; type: string }> {
    return (raw ?? []).map(m => ({
      key:   m.key,
      value: m.value,
      type:  m.type ?? 'TEXT',
    }));
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(
    dto:                CreateProductDto,
    mainImageFile:      Express.Multer.File,
    otherImageFiles:    Express.Multer.File[],
    mainPaletteFile?:   Express.Multer.File,
  ): Promise<ProductDocument> {

    await this.validateClassification(dto.departmentId, dto.categoryId);
    if (dto.brandId)    await this.brandService.findById(dto.brandId);
    if (dto.taxGuideId) await this.taxGuideService.findById(dto.taxGuideId);

    const dupProduct = await this.productModel.findOne({
      sellerSkuId: dto.sellerSkuId, 'flags.isDeleted': false,
    });
    if (dupProduct)
      throw new ConflictException(`Seller SKU "${dto.sellerSkuId}" already exists`);

    const rawVariants = dto.variants ?? [];
    if (!rawVariants.length)
      throw new BadRequestException('At least one variant is required');

    for (const v of rawVariants) {
      if (!v.pricing?.mrp || !v.pricing?.sellingPrice)
        throw new BadRequestException(
          `Variant ${v.sku ?? `${v.color}/${v.size}`} is missing pricing.mrp or pricing.sellingPrice`,
        );
      if (v.pricing.sellingPrice > v.pricing.mrp)
        throw new BadRequestException(
          `Variant ${v.sku ?? `${v.color}/${v.size}`}: sellingPrice cannot exceed mrp`,
        );
      v.sku = v.sku || this.buildVariantSku(dto.sellerSkuId, v.color, v.size);
    }

    const allSkus = rawVariants.map(v => v.sku!);
    const dupSet  = new Set<string>();
    for (const sku of allSkus) {
      if (dupSet.has(sku))
        throw new BadRequestException(`Duplicate variant SKU in request: "${sku}"`);
      dupSet.add(sku);
    }
    const dupVariant = await this.productModel.findOne({
      'variants.sku': { $in: allSkus }, 'flags.isDeleted': false,
    });
    if (dupVariant)
      throw new ConflictException('One or more variant SKUs already exist in the system');

    const builtVariants = rawVariants.map(v => ({
      _id:   new Types.ObjectId(),
      title: v.title || `${v.color} / ${v.size}`,
      sku:   v.sku!,
      barcode: v.barcode,
      color: v.color,
      size:  v.size,
      hsn:   v.hsn,
      status: v.status ?? 'ACTIVE',
      pricing: {
        mrp:          v.pricing.mrp,
        sellingPrice: v.pricing.sellingPrice,
        costPrice:    v.pricing.costPrice,
        currency:     v.pricing.currency ?? 'INR',
      },
      inventory: {
        stock:    v.stock ?? 0,
        reserved: 0,
        available: v.stock ?? 0,
      },
      shipping: v.shipping ?? {},
    }));

    const totals = this.computeTotals(builtVariants);

    const mainRes = await uploadToCloudinary(
      mainImageFile.buffer, 'products/main', mainImageFile.originalname,
    );
    const otherImageTypes = dto.otherImageTypes ?? [];
    const otherImages = await Promise.all(
      otherImageFiles.map(async (f, i) => {
        const res = await uploadToCloudinary(f.buffer, 'products/others', f.originalname);
        return { type: otherImageTypes[i] ?? 'OTHER', url: res.url, publicId: res.publicId };
      }),
    );
    let mainPaletteImage: { url: string; publicId: string } | undefined;
    if (mainPaletteFile) {
      const res = await uploadToCloudinary(
        mainPaletteFile.buffer, 'products/palette', mainPaletteFile.originalname,
      );
      mainPaletteImage = { url: res.url, publicId: res.publicId };
    }

    const product = new this.productModel({
      departmentId: new Types.ObjectId(dto.departmentId),
      categoryId:   new Types.ObjectId(dto.categoryId),
      brandId:      dto.brandId    ? new Types.ObjectId(dto.brandId)    : null,
      taxGuideId:   dto.taxGuideId ? new Types.ObjectId(dto.taxGuideId) : null,
      sellerSkuId:  dto.sellerSkuId,
      groupId:      dto.groupId,
      name:         dto.name,
      styleCode:    dto.styleCode,
      listingStatus: 'Inactive',
      visibility: {
        isPublished:  dto.isPublished  ?? false,
        isSearchable: dto.isSearchable ?? true,
        isFeatured:   dto.isFeatured   ?? false,
      },
      minimumOrderQuantity: dto.minimumOrderQuantity ?? 1,
      origin:      { country: dto.country ?? 'India' },
      mainImage:   { url: mainRes.url, publicId: mainRes.publicId },
      otherImages,
      ...(mainPaletteImage ? { mainPaletteImage } : {}),
      shortDescription: dto.shortDescription,
      description:      dto.description,
      searchKeywords:   dto.searchKeywords   ?? [],
      keyFeatures:      dto.keyFeatures      ?? [],
      videoUrl:         dto.videoUrl,
      seo: {
        metaTitle:       dto.metaTitle,
        metaDescription: dto.metaDescription,
        metaKeywords:    dto.metaKeywords ?? [],
      },
      metadata:      this.normalizeMetadata(dto.metadata),
      variants:      builtVariants,
      totalStock:    totals.totalStock,
      totalReserved: totals.totalReserved,
      availableStock: totals.availableStock,
      flags: { isDeleted: false, isBlocked: false, isDraft: false },
    });

    await product.save();

    await this.inventoryService.setInventoryForProduct(
      (product._id as any).toString(),
      product.name,
      product.sellerSkuId,
      builtVariants.map(v => ({
        variantId:    v._id.toString(),
        size:         v.size,
        color:        v.color,
        stock:        v.inventory.stock,
        variantTitle: v.title,
        variantSku:   v.sku,
      })),
    );

    return product;
  }

  // ─── ADD VARIANT ──────────────────────────────────────────────────────────

  async addVariant(productId: string, dto: AddVariantDto): Promise<ProductDocument> {
    const product = await this.findById(productId);

    // Check duplicate size+color on this product
    const dupCombo = product.variants.find(
      v => v.size === dto.size && v.color === dto.color,
    );
    if (dupCombo)
      throw new BadRequestException(
        `Variant ${dto.color}/${dto.size} already exists on this product`,
      );

    if (dto.pricing.sellingPrice > dto.pricing.mrp)
      throw new BadRequestException('sellingPrice cannot exceed mrp');

    const sku = dto.sku || this.buildVariantSku(product.sellerSkuId, dto.color, dto.size);

    const dupSku = await this.productModel.findOne({
      'variants.sku': sku, 'flags.isDeleted': false,
    });
    if (dupSku)
      throw new ConflictException(`Variant SKU "${sku}" already exists`);

    const stock = dto.stock ?? 0;
    const variantId = new Types.ObjectId();

    const newVariant = {
      _id:   variantId,
      title: dto.title || `${dto.color} / ${dto.size}`,
      sku,
      barcode: dto.barcode,
      color: dto.color,
      size:  dto.size,
      hsn:   dto.hsn,
      status: dto.status ?? 'ACTIVE',
      pricing: {
        mrp:          dto.pricing.mrp,
        sellingPrice: dto.pricing.sellingPrice,
        costPrice:    dto.pricing.costPrice,
        currency:     dto.pricing.currency ?? 'INR',
      },
      inventory: { stock, reserved: 0, available: stock },
      shipping:  dto.shipping ?? {},
    };

    product.variants.push(newVariant as any);

    const totals = this.computeTotals(product.variants);
    product.totalStock     = totals.totalStock;
    product.totalReserved  = totals.totalReserved;
    product.availableStock = totals.availableStock;

    product.markModified('variants');
    await product.save();

    await this.inventoryService.upsertVariantInventory(
      productId, variantId.toString(), product.name,
      product.sellerSkuId, dto.size, dto.color,
      stock, newVariant.title, sku,
    );

    return product;
  }

  // ─── UPDATE VARIANT ───────────────────────────────────────────────────────

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductDocument> {
    const product = await this.findById(productId);
    const idx = product.variants.findIndex(v => v._id.toString() === variantId);
    if (idx < 0) throw new NotFoundException('Variant not found');

    const v = product.variants[idx];

    if (dto.pricing) {
      const newMrp = dto.pricing.mrp ?? v.pricing.mrp;
      const newSp  = dto.pricing.sellingPrice ?? v.pricing.sellingPrice;
      if (newSp > newMrp)
        throw new BadRequestException('sellingPrice cannot exceed mrp');
    }

    if (dto.sku && dto.sku !== v.sku) {
      const dupSku = await this.productModel.findOne({
        'variants.sku': dto.sku, 'flags.isDeleted': false,
      });
      if (dupSku)
        throw new ConflictException(`Variant SKU "${dto.sku}" already exists`);
    }

    if (dto.size)    v.size    = dto.size;
    if (dto.color)   v.color   = dto.color;
    if (dto.sku)     v.sku     = dto.sku;
    if (dto.barcode) v.barcode = dto.barcode;
    if (dto.status)  v.status  = dto.status;
    if (dto.hsn !== undefined) v.hsn = dto.hsn;

    if (dto.title) {
      v.title = dto.title;
    } else if (dto.size || dto.color) {
      v.title = `${v.color} / ${v.size}`;
    }

    if (dto.pricing) {
      v.pricing.mrp          = dto.pricing.mrp          ?? v.pricing.mrp;
      v.pricing.sellingPrice = dto.pricing.sellingPrice ?? v.pricing.sellingPrice;
      v.pricing.costPrice    = dto.pricing.costPrice    ?? v.pricing.costPrice;
      v.pricing.currency     = dto.pricing.currency     ?? v.pricing.currency;
    }

    if (dto.shipping) {
      v.shipping = { ...v.shipping, ...dto.shipping };
    }

    product.variants[idx] = v;
    product.markModified('variants');
    await product.save();

    if (dto.size || dto.color || dto.sku) {
      await this.inventoryService.upsertVariantInventory(
        productId, variantId, product.name, product.sellerSkuId,
        v.size, v.color, v.inventory.stock, v.title, v.sku,
      );
    }

    return product;
  }

  // ─── REMOVE VARIANT ───────────────────────────────────────────────────────

  async removeVariant(productId: string, variantId: string): Promise<ProductDocument> {
    const product = await this.findById(productId);
    const idx = product.variants.findIndex(v => v._id.toString() === variantId);
    if (idx < 0) throw new NotFoundException('Variant not found');

    product.variants.splice(idx, 1);

    const totals = this.computeTotals(product.variants);
    product.totalStock     = totals.totalStock;
    product.totalReserved  = totals.totalReserved;
    product.availableStock = totals.availableStock;

    product.markModified('variants');
    await product.save();

    await this.inventoryService.deleteVariantInventory(productId, variantId);

    return product;
  }

  // ─── GET ALL ──────────────────────────────────────────────────────────────

  async findAll(filters: FilterProductsDto): Promise<PaginatedResult<ProductDocument>> {
    const {
      page, limit, search, sortBy = 'createdAt', sortOrder = 'desc',
      departmentId, categoryId, listingStatus, brand,
      isFeatured, isPublished, isDraft,
      mrpMin, mrpMax, sellingPriceMin, sellingPriceMax,
    } = filters;

    const query: Record<string, any> = { 'flags.isDeleted': false };

    if (departmentId)  query.departmentId               = new Types.ObjectId(departmentId);
    if (categoryId)    query.categoryId                 = new Types.ObjectId(categoryId);
    if (listingStatus) query.listingStatus              = listingStatus;
    if (brand)         query['brandId']                 = brand;
    if (isFeatured  !== undefined) query['visibility.isFeatured']  = isFeatured;
    if (isPublished !== undefined) query['visibility.isPublished'] = isPublished;
    if (isDraft     !== undefined) query['flags.isDraft']          = isDraft;

    if (mrpMin !== undefined || mrpMax !== undefined) {
      query['variants.pricing.mrp'] = {};
      if (mrpMin !== undefined) query['variants.pricing.mrp'].$gte = mrpMin;
      if (mrpMax !== undefined) query['variants.pricing.mrp'].$lte = mrpMax;
    }

    if (sellingPriceMin !== undefined || sellingPriceMax !== undefined) {
      query['variants.pricing.sellingPrice'] = {};
      if (sellingPriceMin !== undefined) query['variants.pricing.sellingPrice'].$gte = sellingPriceMin;
      if (sellingPriceMax !== undefined) query['variants.pricing.sellingPrice'].$lte = sellingPriceMax;
    }

    if (search) {
      const re = { $regex: search, $options: 'i' };
      query.$or = [
        { name: re }, { sellerSkuId: re }, { styleCode: re },
        { description: re },
        { searchKeywords: { $in: [new RegExp(search, 'i')] } },
        { 'variants.sku': re },
      ];
    }

    const allowedSort = ['name', 'createdAt', 'totalStock', 'listingStatus'];
    const safeSortBy  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, 1 | -1> = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    return paginate<ProductDocument>(
      this.productModel, query, { page, limit }, sort,
    );
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Product not found');

    const product = await this.productModel
      .findOne({ _id: id, 'flags.isDeleted': false })
      .populate('departmentId', 'name')
      .populate('categoryId',   'name')
      .populate('brandId',      'name logo')
      .populate('taxGuideId',   'name taxRate hsnCode');

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(
    id:              string,
    dto:             UpdateProductDto,
    mainImageFile?:  Express.Multer.File,
    addOtherFiles?:  Express.Multer.File[],
    paletteFile?:    Express.Multer.File,
  ): Promise<ProductDocument> {
    const product = await this.findById(id);

    if (dto.departmentId || dto.categoryId) {
      await this.validateClassification(
        dto.departmentId ?? product.departmentId.toString(),
        dto.categoryId   ?? product.categoryId.toString(),
      );
    }
    if (dto.brandId)    await this.brandService.findById(dto.brandId);
    if (dto.taxGuideId) await this.taxGuideService.findById(dto.taxGuideId);

    const updateData: Record<string, any> = {};

    const scalars = [
      'listingStatus', 'name', 'styleCode', 'groupId',
      'shortDescription', 'description', 'videoUrl',
      'minimumOrderQuantity',
      'searchKeywords', 'keyFeatures', 'metaKeywords',
    ];
    for (const f of scalars) {
      if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f];
    }

    if (dto.departmentId) updateData.departmentId = new Types.ObjectId(dto.departmentId);
    if (dto.categoryId)   updateData.categoryId   = new Types.ObjectId(dto.categoryId);
    if (dto.brandId)      updateData.brandId      = new Types.ObjectId(dto.brandId);
    if (dto.taxGuideId)   updateData.taxGuideId   = new Types.ObjectId(dto.taxGuideId);

    if (dto.country) updateData.origin = { country: dto.country };

    if (dto.isPublished  !== undefined) updateData['visibility.isPublished']  = dto.isPublished;
    if (dto.isSearchable !== undefined) updateData['visibility.isSearchable'] = dto.isSearchable;
    if (dto.isFeatured   !== undefined) updateData['visibility.isFeatured']   = dto.isFeatured;

    if (dto.isBlocked !== undefined) updateData['flags.isBlocked'] = dto.isBlocked;
    if (dto.isDraft   !== undefined) updateData['flags.isDraft']   = dto.isDraft;

    if (dto.metaTitle)       updateData['seo.metaTitle']       = dto.metaTitle;
    if (dto.metaDescription) updateData['seo.metaDescription'] = dto.metaDescription;
    if (dto.metaKeywords)    updateData['seo.metaKeywords']    = dto.metaKeywords;

    if (dto.metadata) updateData.metadata = this.normalizeMetadata(dto.metadata);

    if (mainImageFile) {
      if (product.mainImage?.publicId)
        await deleteFromCloudinary(product.mainImage.publicId);
      const res = await uploadToCloudinary(
        mainImageFile.buffer, 'products/main', mainImageFile.originalname,
      );
      updateData.mainImage = { url: res.url, publicId: res.publicId };
    }

    if (paletteFile) {
      if (product.mainPaletteImage?.publicId)
        await deleteFromCloudinary(product.mainPaletteImage.publicId);
      const res = await uploadToCloudinary(
        paletteFile.buffer, 'products/palette', paletteFile.originalname,
      );
      updateData.mainPaletteImage = { url: res.url, publicId: res.publicId };
    }

    let currentOthers = [...(product.otherImages ?? [])];
    if (dto.removeOtherImages?.length) {
      for (const pid of dto.removeOtherImages) await deleteFromCloudinary(pid);
      currentOthers = currentOthers.filter(i => !dto.removeOtherImages!.includes(i.publicId));
    }

    if (addOtherFiles?.length) {
      if (currentOthers.length + addOtherFiles.length > 10)
        throw new BadRequestException('Maximum 10 other images allowed');
      const addTypes = (dto as any).addOtherImageTypes ?? [];
      for (let i = 0; i < addOtherFiles.length; i++) {
        const res = await uploadToCloudinary(
          addOtherFiles[i].buffer, 'products/others', addOtherFiles[i].originalname,
        );
        currentOthers.push({
          type: addTypes[i] ?? 'OTHER',
          url:  res.url,
          publicId: res.publicId,
        });
      }
    }

    if (dto.removeOtherImages?.length || addOtherFiles?.length) {
      updateData.otherImages = currentOthers;
    }

    const updated = await this.productModel.findOneAndUpdate(
      { _id: id, 'flags.isDeleted': false },
      { $set: updateData },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Product not found');
    const p = await this.productModel.findOneAndUpdate(
      { _id: id, 'flags.isDeleted': false },
      { $set: { 'flags.isDeleted': true } },
    );
    if (!p) throw new NotFoundException('Product not found');
  }

  // ─── BULK UPLOAD ──────────────────────────────────────────────────────────

  async createBulkFromExcel(
    file: Express.Multer.File,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]], { defval: null },
    );
    if (!rows.length) throw new BadRequestException('Excel file is empty');

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const deptName = String(row['Department'] ?? '').trim();
        if (!deptName) throw new Error('Missing "Department"');
        const dept = await this.departmentService.findByName(deptName);
        if (!dept) throw new Error(`Department "${deptName}" not found`);

        const catName = String(row['Category'] ?? '').trim();
        if (!catName) throw new Error('Missing "Category"');
        const cat = await this.categoryService.findByNameAndDepartment(catName, dept._id.toString());
        if (!cat) throw new Error(`Category "${catName}" not found in "${deptName}"`);

        let brandId: Types.ObjectId | null = null;
        const brandName = String(row['Brand'] ?? '').trim();
        if (brandName) {
          const brand = await this.brandService.findByName(brandName);
          if (!brand) throw new Error(`Brand "${brandName}" not found. Create it first.`);
          brandId = brand._id as Types.ObjectId;
        }

        let taxGuideId: Types.ObjectId | null = null;
        const taxName = String(row['Tax Guide'] ?? '').trim();
        if (taxName) {
          const tax = await this.taxGuideService.findByName(taxName);
          if (!tax) throw new Error(`Tax guide "${taxName}" not found`);
          taxGuideId = tax._id as Types.ObjectId;
        }

        const skuId = String(row['Seller SKU ID'] ?? '').trim();
        if (!skuId) throw new Error('Missing "Seller SKU ID"');

        const name = String(row['Name'] ?? '').trim();
        if (!name) throw new Error('Missing "Name"');

        const sizes    = String(row['Size']  ?? '').split('::').map(s => s.trim()).filter(Boolean);
        const colors   = String(row['Color'] ?? '').split('::').map(s => s.trim()).filter(Boolean);
        const stocks   = String(row['Stock'] ?? '0').split('::').map(s => parseInt(s.trim()) || 0);
        const mrpList      = String(row['MRP (INR)'] ?? '0').split('::').map(s => Number(s.trim()));
        const spList       = String(row['Selling Price (INR)'] ?? '0').split('::').map(s => Number(s.trim()));
        const weightsKg    = String(row['Weight (KG)']  ?? '').split('::').map(s => s.trim());
        const lengthsCm    = String(row['Length (CM)']  ?? '').split('::').map(s => s.trim());
        const breadthsCm   = String(row['Breadth (CM)'] ?? '').split('::').map(s => s.trim());
        const heightsCm    = String(row['Height (CM)']  ?? '').split('::').map(s => s.trim());
        // New: per-variant SKU, Title, HSN
        const variantSkus    = row['Variant SKU']    ? String(row['Variant SKU']).split('::').map(s => s.trim())    : [];
        const variantTitles  = row['Variant Title']  ? String(row['Variant Title']).split('::').map(s => s.trim())  : [];
        const hsnList        = row['HSN']            ? String(row['HSN']).split('::').map(s => s.trim())            : [];

        const count = Math.max(sizes.length, colors.length);
        if (!count) throw new Error('At least one Size or Color is required');

        const dupProduct = await this.productModel.findOne({
          sellerSkuId: skuId, 'flags.isDeleted': false,
        });
        if (dupProduct) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Seller SKU "${skuId}" already exists — skipped`);
          continue;
        }

        const builtVariants: any[] = [];
        for (let vi = 0; vi < count; vi++) {
          const size  = sizes[vi]  ?? sizes[0]  ?? 'One Size';
          const color = colors[vi] ?? colors[0] ?? 'Default';
          const mrp   = mrpList[vi] ?? mrpList[0] ?? 0;
          const sp    = spList[vi]  ?? spList[0]  ?? 0;
          if (!mrp) throw new Error(`Row ${rowNum}, variant ${vi + 1}: Missing MRP`);
          if (sp > mrp) throw new Error(`Row ${rowNum}, variant ${vi + 1}: sellingPrice > mrp`);

          const variantSku   = variantSkus[vi]   && variantSkus[vi] !== ''
            ? variantSkus[vi]
            : this.buildVariantSku(skuId, color, size);
          const variantTitle = variantTitles[vi] && variantTitles[vi] !== ''
            ? variantTitles[vi]
            : `${color} / ${size}`;
          const variantHsn   = hsnList[vi] || hsnList[0] || undefined;

          builtVariants.push({
            _id:   new Types.ObjectId(),
            title: variantTitle,
            sku:   variantSku,
            color, size,
            hsn:   variantHsn,
            status: 'ACTIVE',
            pricing: { mrp, sellingPrice: sp, currency: 'INR' },
            inventory: {
              stock:    stocks[vi] ?? 0,
              reserved: 0,
              available: stocks[vi] ?? 0,
            },
            shipping: {
              weightKg:  weightsKg[vi]  ? Number(weightsKg[vi])  : undefined,
              lengthCm:  lengthsCm[vi]  ? Number(lengthsCm[vi])  : undefined,
              breadthCm: breadthsCm[vi] ? Number(breadthsCm[vi]) : undefined,
              heightCm:  heightsCm[vi]  ? Number(heightsCm[vi])  : undefined,
            },
          });
        }

        const reserved = new Set([
          'Department', 'Category', 'Brand', 'Tax Guide', 'Seller SKU ID', 'Group ID',
          'Name', 'Style Code', 'MRP (INR)', 'Selling Price (INR)',
          'Size', 'Color', 'Stock',
          'Weight (KG)', 'Length (CM)', 'Breadth (CM)', 'Height (CM)',
          'Variant SKU', 'Variant Title', 'HSN',
          'Country', 'Short Description', 'Description', 'Keywords',
          'Main Image URL',
          'Other Image 1 URL', 'Other Image 1 Type',
          'Other Image 2 URL', 'Other Image 2 Type',
          'Other Image 3 URL', 'Other Image 3 Type',
          'Other Image 4 URL', 'Other Image 4 Type',
          'Other Image 5 URL', 'Other Image 5 Type',
          'Meta Title', 'Meta Description', 'Meta Keywords',
        ]);

        const metadata = Object.entries(row)
          .filter(([k, v]) => !reserved.has(k) && v !== null && v !== '')
          .map(([k, v]) => ({ key: k.trim(), value: String(v).trim(), type: 'TEXT' }));

        // Images from URLs
        const otherImages: any[] = [];
        for (let ii = 1; ii <= 5; ii++) {
          const url  = row[`Other Image ${ii} URL`]  ? String(row[`Other Image ${ii} URL`]).trim()  : null;
          const type = row[`Other Image ${ii} Type`] ? String(row[`Other Image ${ii} Type`]).trim() : 'OTHER';
          if (url) otherImages.push({ type, url, publicId: '' });
        }

        const totals = this.computeTotals(builtVariants);
        const mainImageUrl = row['Main Image URL'] ? String(row['Main Image URL']).trim() : null;

        const product = new this.productModel({
          departmentId: dept._id,
          categoryId:   cat._id,
          brandId,
          taxGuideId,
          sellerSkuId:  skuId,
          groupId:      row['Group ID'] ? String(row['Group ID']).trim() : undefined,
          name,
          styleCode:    row['Style Code'] ? String(row['Style Code']).trim() : undefined,
          listingStatus: 'Inactive',
          visibility:   { isPublished: false, isSearchable: true, isFeatured: false },
          minimumOrderQuantity: 1,
          origin:       { country: row['Country'] ? String(row['Country']).trim() : 'India' },
          mainImage:    mainImageUrl ? { url: mainImageUrl, publicId: '' } : undefined,
          otherImages,
          shortDescription: row['Short Description'] ? String(row['Short Description']).trim() : undefined,
          description:      row['Description'] ? String(row['Description']).trim() : undefined,
          searchKeywords:   row['Keywords'] ? String(row['Keywords']).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          seo: {
            metaTitle:       row['Meta Title']       ? String(row['Meta Title']).trim()       : undefined,
            metaDescription: row['Meta Description'] ? String(row['Meta Description']).trim() : undefined,
            metaKeywords:    row['Meta Keywords']    ? String(row['Meta Keywords']).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          },
          metadata,
          variants:      builtVariants,
          totalStock:    totals.totalStock,
          totalReserved: 0,
          availableStock: totals.totalStock,
          flags: { isDeleted: false, isBlocked: false, isDraft: false },
        });

        await product.save();

        await this.inventoryService.setInventoryForProduct(
          (product._id as any).toString(),
          product.name,
          product.sellerSkuId,
          builtVariants.map(v => ({
            variantId:    v._id.toString(),
            size:         v.size,
            color:        v.color,
            stock:        v.inventory.stock,
            variantTitle: v.title,
            variantSku:   v.sku,
          })),
        );

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${(err as Error).message}`);
      }
    }

    return results;
  }
}