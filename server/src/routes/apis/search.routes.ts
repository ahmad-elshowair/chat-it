import { Router } from 'express';
import searchController from '../../controllers/search.controller.js';
import authorize_user from '../../middlewares/auth.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import { validateSearch } from '../../middlewares/validations/search.js';

const searchRoute: Router = Router();

searchRoute.get('/', authorize_user, validateSearch, validationMiddleware, searchController.search);

export default searchRoute;
