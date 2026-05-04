import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { Product, ProductDocument, ProductImage } from './schemas/product.schema';
import { ListingStatus } from './enums/product.enums';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { uploadToCloudinary, deleteFromCloudinary } from '../../common/cloudinary';
import { FilterProductsDto } from './dto/filter-products.dto';
import { paginate, PaginatedResult } from '../../common/pagination';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(
    dto: CreateProductDto,
    mainImageFile: Express.Multer.File,
    otherImageFiles: Express.Multer.File[],
    mainPaletteImageFile?: Express.Multer.File,
  ): Promise<ProductDocument> {
    if (dto.fabric?.length > 2)
      throw new BadRequestException('fabric accepts a maximum of 2 values');
    if (otherImageFiles.length > 5)
      throw new BadRequestException('otherImages accepts a maximum of 5 images');
    if (dto.sellingPrice > dto.mrp)
      throw new BadRequestException('sellingPrice cannot be greater than mrp');

    const exists = await this.productModel.findOne({ sellerSkuId: dto.sellerSkuId, isDeleted: false });
    if (exists) throw new ConflictException(`Seller SKU ID "${dto.sellerSkuId}" already exists`);

    const mainImage = await this._upload(mainImageFile, 'products/main');
    const otherImages = await Promise.all(otherImageFiles.map((f) => this._upload(f, 'products/others')));
    const mainPaletteImage = mainPaletteImageFile
      ? await this._upload(mainPaletteImageFile, 'products/palette')
      : undefined;

    const { mainImage: _mi, otherImages: _oi, mainPaletteImage: _mpi, ...rest } = dto as any;
    const product = new this.productModel({
      ...rest,
      mainImage,
      otherImages,
      ...(mainPaletteImage ? { mainPaletteImage } : {}),
      listingStatus: dto.listingStatus ?? ListingStatus.INACTIVE,
    });
    return product.save();
  }

  // ─── BULK from EXCEL ──────────────────────────────────────────────────────

  async createBulkFromExcel(
    excelFile: Express.Multer.File,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const workbook = XLSX.read(excelFile.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { defval: null },
    );

    if (!rows.length) throw new BadRequestException('Excel file is empty');

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        this._validateExcelRow(row, rowNum);

        const mrp = Number(row['MRP (INR)']);
        const sellingPrice = Number(row['Your selling price (INR)']);
        if (sellingPrice > mrp) {
          throw new Error(`sellingPrice (${sellingPrice}) cannot exceed MRP (${mrp})`);
        }

        const exists = await this.productModel.findOne({
          sellerSkuId: String(row['Seller SKU ID']),
          isDeleted: false,
        });
        if (exists) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: SKU "${row['Seller SKU ID']}" already exists — skipped`);
          continue;
        }

        const dto = this._mapExcelRow(row);

        if ((dto.fabric as string[])?.length > 2) {
          throw new Error('fabric column: maximum 2 values allowed');
        }

        const product = new this.productModel({
          ...dto,
          listingStatus: dto.listingStatus ?? ListingStatus.INACTIVE,
        });
        await product.save();
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: ${(err as Error).message ?? String(err)}`);
      }
    }
    return results;
  }

  // ─── GET ALL (with filters, search, sort, pagination) ───────────────────────

  async findAll(filters: FilterProductsDto): Promise<PaginatedResult<ProductDocument>> {
    const {
      page, limit, search, sortBy = 'createdAt', sortOrder = 'desc',
      listingStatus, mrpMin, mrpMax, sellingPriceMin, sellingPriceMax,
      brand, idealFor, sleeveLength, pattern, fabric, topType, bottomType,
      additionalGarments, size, color, occasion, kurtaStyleType, neck,
      trend, sleeveStyle, topLength, dupattalIncluded, coOrdSet,
    } = filters;

    const query: Record<string, any> = { isDeleted: false };

    if (listingStatus) query.listingStatus = listingStatus;

    if (mrpMin !== undefined || mrpMax !== undefined) {
      query.mrp = {};
      if (mrpMin !== undefined) query.mrp.$gte = mrpMin;
      if (mrpMax !== undefined) query.mrp.$lte = mrpMax;
    }
    if (sellingPriceMin !== undefined || sellingPriceMax !== undefined) {
      query.sellingPrice = {};
      if (sellingPriceMin !== undefined) query.sellingPrice.$gte = sellingPriceMin;
      if (sellingPriceMax !== undefined) query.sellingPrice.$lte = sellingPriceMax;
    }

    if (idealFor)           query.idealFor           = idealFor;
    if (sleeveLength)       query.sleeveLength       = sleeveLength;
    if (topType)            query.topType            = topType;
    if (bottomType)         query.bottomType         = bottomType;
    if (additionalGarments) query.additionalGarments = additionalGarments;
    if (size)               query.size               = size;
    if (kurtaStyleType)     query.kurtaStyleType     = kurtaStyleType;
    if (neck)               query.neck               = neck;
    if (sleeveStyle)        query.sleeveStyle        = sleeveStyle;
    if (topLength)          query.topLength          = topLength;

    if (brand) query.brand = { $regex: brand, $options: 'i' };

    if (pattern)  query.pattern  = { $in: [pattern] };
    if (fabric)   query.fabric   = { $in: [fabric] };
    if (color)    query.color    = { $in: [color] };
    if (occasion) query.occasion = { $in: [occasion] };
    if (trend)    query.trend    = { $in: [trend] };

    if (dupattalIncluded !== undefined) query.dupattalIncluded = dupattalIncluded;
    if (coOrdSet !== undefined)         query.coOrdSet         = coOrdSet;

    if (search) {
      const re = { $regex: search, $options: 'i' };
      query.$or = [
        { brand: re }, { sellerSkuId: re }, { styleCode: re },
        { description: re }, { searchKeywords: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const allowedSort = ['mrp', 'sellingPrice', 'stock', 'createdAt', 'brand'];
    const safeSortBy  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, 1 | -1> = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    return paginate<ProductDocument>(
      this.productModel,
      query,
      { page, limit },
      sort,
    );
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Product not found');
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateProductDto,
    mainImageFile?: Express.Multer.File,
    addOtherImageFiles?: Express.Multer.File[],
    mainPaletteImageFile?: Express.Multer.File,
  ): Promise<ProductDocument> {
    const product = await this.findById(id);

    if (dto.fabric && dto.fabric.length > 2) {
      throw new BadRequestException('fabric accepts a maximum of 2 values');
    }

    const newMrp = dto.mrp ?? product.mrp;
    const newSellingPrice = dto.sellingPrice ?? product.sellingPrice;
    if (newSellingPrice > newMrp) {
      throw new BadRequestException('sellingPrice cannot be greater than mrp');
    }

    const updateData: Record<string, any> = { ...dto };
    delete updateData.removeOtherImages;
    delete updateData.addOtherImages;
    delete updateData.mainPaletteImage; 

    if (mainImageFile) {
      if (product.mainImage?.publicId) await deleteFromCloudinary(product.mainImage.publicId);
      updateData.mainImage = await this._upload(mainImageFile, 'products/main');
    }

    if (mainPaletteImageFile) {
      if ((product as any).mainPaletteImage?.publicId)
        await deleteFromCloudinary((product as any).mainPaletteImage.publicId);
      updateData.mainPaletteImage = await this._upload(mainPaletteImageFile, 'products/palette');
    }

    let currentOtherImages: ProductImage[] = [...(product.otherImages || [])];

    if (dto.removeOtherImages?.length) {
      for (const publicId of dto.removeOtherImages) {
        await deleteFromCloudinary(publicId);
      }
      currentOtherImages = currentOtherImages.filter(
        (img) => !dto.removeOtherImages!.includes(img.publicId),
      );
    }

    if (addOtherImageFiles?.length) {
      const totalAfterAdd = currentOtherImages.length + addOtherImageFiles.length;
      if (totalAfterAdd > 5) {
        throw new BadRequestException(
          `Cannot add ${addOtherImageFiles.length} image(s) — product already has ${currentOtherImages.length} other image(s). Maximum is 5 total.`,
        );
      }
      const newImages = await Promise.all(
        addOtherImageFiles.map((f) => this._upload(f, 'products/others')),
      );
      currentOtherImages = [...currentOtherImages, ...newImages];
    }

    if (dto.removeOtherImages?.length || addOtherImageFiles?.length) {
      updateData.otherImages = currentOtherImages;
    }

    const updated = await this.productModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true },
    );
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Product not found');
    const product = await this.productModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), isDeleted: false },
      { isDeleted: true },
    );
    if (!product) throw new NotFoundException('Product not found');
  }

  private async _upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<ProductImage> {
    const result = await uploadToCloudinary(file.buffer, folder, file.originalname);
    return { url: result.url, publicId: result.publicId };
  }

  private _validateExcelRow(row: Record<string, any>, rowNum: number) {
    const required = [
      'Seller SKU ID', 'MRP (INR)', 'Your selling price (INR)', 'Brand',
      'Items Included', 'Ideal For', 'Sleeve Length', 'Pattern', 'Fabric',
      'Top Type', 'Bottom Type', 'Size', 'Style Code', 'Color',
    ];
    const missing = required.filter(
      (f) => row[f] === null || row[f] === undefined || row[f] === '',
    );
    if (missing.length) {
      throw new Error(`Missing required field(s): ${missing.map((f) => `"${f}"`).join(', ')}`);
    }
  }

  private _mapExcelRow(row: Record<string, any>): Record<string, any> {
    const split = (val: any): string[] =>
      val ? String(val).split('::').map((s) => s.trim()).filter(Boolean) : [];
    const bool = (val: any) => val === 'Yes' || val === true;
    const num = (val: any) => (val !== null && val !== undefined && val !== '') ? Number(val) : undefined;

    const urlToImage = (url: any): ProductImage | null => {
      if (!url || String(url).trim() === '') return null;
      const urlStr = String(url).trim();
      try {
        const pathname = new URL(urlStr).pathname;
        const parts = pathname.replace(/^\//, '').split('/').filter((p) => !/^v\d+$/.test(p));
        parts[parts.length - 1] = parts[parts.length - 1].replace(/\.[^.]+$/, '');
        const publicId = parts.join('/') || urlStr;
        return { url: urlStr, publicId };
      } catch {
        return { url: urlStr, publicId: urlStr };
      }
    };

    return {
      sellerSkuId:        String(row['Seller SKU ID']),
      groupId:            row['Group ID'] ? String(row['Group ID']) : undefined,
      listingStatus:      row['Listing Status'] || ListingStatus.INACTIVE,
      mrp:                Number(row['MRP (INR)']),
      sellingPrice:       Number(row['Your selling price (INR)']),
      procurementType:    row['Procurement type'] || 'e-cart',
      procurementSla:     num(row['Procurement SLA (DAY)']),
      stock:              num(row['Stock']) ?? 0,
      shippingProvider:   row['Shipping provider'] || undefined,
      localHandlingFee:   num(row['Local handling fee (INR)']) ?? 0,
      zonalHandlingFee:   num(row['Zonal handling fee (INR)']) ?? 0,
      nationalHandlingFee: num(row['National handling fee (INR)']) ?? 0,
      lengthCm:           num(row['Length (CM)']),
      breadthCm:          num(row['Breadth (CM)']),
      heightCm:           num(row['Height (CM)']),
      weightKg:           num(row['Weight (KG)']),
      hsn:                row['HSN'] ? String(row['HSN']) : undefined,
      luxuryCess:         num(row['Luxury Cess']),
      countryOfOrigin:    row['Country Of Origin'] || 'India',
      manufacturerDetails: row['Manufacturer Details'] || undefined,
      packerDetails:      row['Packer Details'] || undefined,
      importerDetails:    row['Importer Details'] || undefined,
      taxCode:            row['Tax Code'] || undefined,
      minimumOrderQuantity: num(row['Minimum Order Quantity (MinOQ)']) ?? 1,
      brand:              String(row['Brand']),
      itemsIncluded:      split(row['Items Included']),
      idealFor:           row['Ideal For'],
      sleeveLength:       row['Sleeve Length'],
      pattern:            split(row['Pattern']),
      fabric:             split(row['Fabric']),
      topType:            row['Top Type'],
      bottomType:         row['Bottom Type'],
      additionalGarments: row['Additional Garments'] || undefined,
      size:               String(row['Size']),
      sizeMeasuringUnit:  row['Size - Measuring Unit'] || 'Regular',
      styleCode:          String(row['Style Code']),
      color:              split(row['Color']),
      brandColor:         split(row['Brand Color']),
      // Images from Excel — stored as {url, publicId}; publicId is derived from the URL.
      // Use PATCH /admin/products/:id to replace with a proper Cloudinary upload later.
      mainImage: urlToImage(row['mainImage URL']),
      otherImages: [
        urlToImage(row['otherImage1 URL']),
        urlToImage(row['otherImage2 URL']),
        urlToImage(row['otherImage3 URL']),
        urlToImage(row['otherImage4 URL']),
        urlToImage(row['otherImage5 URL']),
      ].filter(Boolean) as ProductImage[],
      mainPaletteImage: urlToImage(row['Main Palette Image URL']) ?? undefined,
      occasion:           split(row['Occasion']),
      topFabric:          split(row['Top Fabric']),
      bottomFabric:       split(row['Bottom Fabric']),
      kurtaStyleType:     row['Kurta Style Type'] || undefined,
      ornamentationType:  split(row['Ornamentation Type']),
      secondaryColor:     split(row['Secondary Color']),
      fabricCare:         split(row['Fabric Care']),
      liningMaterial:     split(row['Lining Material']),
      knitType:           split(row['Knit Type']),
      neck:               row['Neck'] || undefined,
      videoUrl:           row['Video URL'] || undefined,
      trend:              split(row['Trend']),
      patternPrintType:   split(row['Pattern/Print Type']),
      sleeveStyle:        row['Sleeve Style'] || undefined,
      detailPlacement:    split(row['Detail Placement']),
      surfaceStyling:     split(row['Surface Styling']),
      dupattalIncluded:   bool(row['Dupatta Included']),
      netQuantity:        row['Net Quantity'] ? String(row['Net Quantity']) : undefined,
      coOrdSet:           bool(row['Co-ord Set']),
      ean:                row['EAN/UPC'] ? String(row['EAN/UPC']) : undefined,
      eanMeasuringUnit:   row['EAN/UPC - Measuring Unit'] || undefined,
      otherDetails:       split(row['Other Details']),
      description:        row['Description'] || undefined,
      searchKeywords:     split(row['Search Keywords']),
      keyFeatures:        split(row['Key Features']),
      topLength:          row['Top Length'] || undefined,
      fit:                row['Fit'] || undefined,
      style:              split(row['Style']),
      lining:             row['Lining'] === 'Yes' ? true : row['Lining'] === 'No' ? false : undefined,
      waistband:          split(row['Waistband']),
      design:             split(row['Design']),
    };
  }
}